-- Migration: Add Photographer Rating System
-- Combines time-weighted and predictive accuracy approaches

-- Add photographer fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_status TEXT CHECK (photographer_status IN ('pending', 'approved', 'denied')) DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_applied_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_influence DECIMAL(4,2) DEFAULT 1.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_total_ratings INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_accurate_ratings INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photographer_accuracy_percentage DECIMAL(5,2) DEFAULT 0.0;

-- Create photo_ratings table
CREATE TABLE IF NOT EXISTS public.photo_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    rating_label TEXT CHECK (rating_label IN ('low_quality', 'standard', 'good', 'high_quality', 'exceptional')) NOT NULL,
    time_to_rate_hours DECIMAL(10,2), -- How long after post creation was this rated
    influence_at_rating DECIMAL(4,2) DEFAULT 1.0, -- Photographer's influence when they rated
    was_accurate BOOLEAN DEFAULT NULL, -- Determined after 7 days
    accuracy_bonus DECIMAL(3,2) DEFAULT 0.0, -- Bonus earned from this rating
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(user_id, post_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_photo_ratings_post_id ON public.photo_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_photo_ratings_user_id ON public.photo_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_ratings_evaluated ON public.photo_ratings(was_accurate, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_users_photographer_status ON public.users(photographer_status);

-- Add quality score fields to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS weighted_rating_sum DECIMAL(10,2) DEFAULT 0.0;

-- Enable RLS on photo_ratings
ALTER TABLE public.photo_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_ratings (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.photo_ratings;
DROP POLICY IF EXISTS "Approved photographers can rate" ON public.photo_ratings;
DROP POLICY IF EXISTS "Photographers can update own ratings" ON public.photo_ratings;
DROP POLICY IF EXISTS "Photographers can delete own unprocessed ratings" ON public.photo_ratings;

CREATE POLICY "Anyone can view ratings" ON public.photo_ratings
    FOR SELECT USING (true);

CREATE POLICY "Approved photographers can rate" ON public.photo_ratings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND photographer_status = 'approved'
        )
    );

CREATE POLICY "Photographers can update own ratings" ON public.photo_ratings
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        was_accurate IS NULL
    );

CREATE POLICY "Photographers can delete own unprocessed ratings" ON public.photo_ratings
    FOR DELETE USING (
        auth.uid() = user_id AND 
        was_accurate IS NULL
    );

-- Function to calculate quality score when a rating is added
CREATE OR REPLACE FUNCTION calculate_post_quality_score(post_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    weighted_sum DECIMAL(10,2);
    total_influence DECIMAL(10,2);
    final_score DECIMAL(5,2);
BEGIN
    -- Calculate weighted average based on photographer influence
    SELECT 
        COALESCE(SUM(rating * influence_at_rating), 0),
        COALESCE(SUM(influence_at_rating), 0)
    INTO weighted_sum, total_influence
    FROM public.photo_ratings
    WHERE post_id = post_uuid;
    
    IF total_influence > 0 THEN
        final_score := weighted_sum / total_influence;
    ELSE
        final_score := NULL;
    END IF;
    
    -- Update post with quality score
    UPDATE public.posts
    SET 
        quality_score = final_score,
        rating_count = (SELECT COUNT(*) FROM public.photo_ratings WHERE post_id = post_uuid),
        weighted_rating_sum = weighted_sum
    WHERE id = post_uuid;
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate quality score when rating added/updated
CREATE OR REPLACE FUNCTION update_quality_score_on_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_post_quality_score(NEW.post_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_change
    AFTER INSERT OR UPDATE ON public.photo_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_score_on_rating();

-- Function to evaluate rating accuracy after 7 days
CREATE OR REPLACE FUNCTION evaluate_rating_accuracy()
RETURNS void AS $$
DECLARE
    rating_record RECORD;
    post_likes INTEGER;
    post_age_days DECIMAL;
    is_accurate BOOLEAN;
    bonus DECIMAL(3,2);
    time_bonus DECIMAL(3,2);
BEGIN
    -- Find ratings that are 7+ days old and haven't been evaluated
    FOR rating_record IN
        SELECT pr.*, p.created_at as post_created_at
        FROM public.photo_ratings pr
        JOIN public.posts p ON pr.post_id = p.id
        WHERE pr.was_accurate IS NULL
        AND p.created_at < NOW() - INTERVAL '7 days'
    LOOP
        -- Get current like count for the post
        SELECT COUNT(*) INTO post_likes
        FROM public.likes
        WHERE post_id = rating_record.post_id;
        
        -- Determine if rating was accurate based on like count
        is_accurate := FALSE;
        
        IF rating_record.rating = 5 AND post_likes >= 50 THEN
            is_accurate := TRUE;
        ELSIF rating_record.rating = 4 AND post_likes >= 30 AND post_likes < 70 THEN
            is_accurate := TRUE;
        ELSIF rating_record.rating = 3 AND post_likes >= 10 AND post_likes < 40 THEN
            is_accurate := TRUE;
        ELSIF rating_record.rating = 2 AND post_likes >= 3 AND post_likes < 15 THEN
            is_accurate := TRUE;
        ELSIF rating_record.rating = 1 AND post_likes < 5 THEN
            is_accurate := TRUE;
        END IF;
        
        -- Calculate time-weighted bonus
        IF rating_record.time_to_rate_hours <= 2 THEN
            time_bonus := 0.15; -- Rated within 2 hours
        ELSIF rating_record.time_to_rate_hours <= 24 THEN
            time_bonus := 0.10; -- Rated within 24 hours
        ELSIF rating_record.time_to_rate_hours <= 72 THEN
            time_bonus := 0.05; -- Rated within 3 days
        ELSE
            time_bonus := 0.02; -- Late rating
        END IF;
        
        -- Calculate final bonus (only if accurate)
        IF is_accurate THEN
            bonus := time_bonus;
        ELSE
            bonus := -time_bonus; -- Penalty for inaccurate ratings
        END IF;
        
        -- Update the rating record
        UPDATE public.photo_ratings
        SET 
            was_accurate = is_accurate,
            accuracy_bonus = bonus,
            evaluated_at = NOW()
        WHERE id = rating_record.id;
        
        -- Update photographer's influence
        UPDATE public.users
        SET 
            photographer_total_ratings = photographer_total_ratings + 1,
            photographer_accurate_ratings = CASE 
                WHEN is_accurate THEN photographer_accurate_ratings + 1 
                ELSE photographer_accurate_ratings 
            END,
            photographer_influence = GREATEST(0.1, LEAST(5.0, photographer_influence + bonus)),
            photographer_accuracy_percentage = (
                CASE 
                    WHEN photographer_total_ratings + 1 > 0 
                    THEN (photographer_accurate_ratings::DECIMAL + CASE WHEN is_accurate THEN 1 ELSE 0 END) / (photographer_total_ratings + 1) * 100
                    ELSE 0 
                END
            )
        WHERE id = rating_record.user_id;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job helper (you'll need to call this via cron or Edge Function)
COMMENT ON FUNCTION evaluate_rating_accuracy() IS 'Run this daily via cron to evaluate photographer rating accuracy and update influence scores';

-- Function to calculate time to rate when rating is created
CREATE OR REPLACE FUNCTION set_time_to_rate()
RETURNS TRIGGER AS $$
DECLARE
    post_created TIMESTAMPTZ;
    hours_diff DECIMAL(10,2);
BEGIN
    SELECT created_at INTO post_created
    FROM public.posts
    WHERE id = NEW.post_id;
    
    hours_diff := EXTRACT(EPOCH FROM (NOW() - post_created)) / 3600;
    NEW.time_to_rate_hours := hours_diff;
    
    -- Get photographer's current influence
    SELECT photographer_influence INTO NEW.influence_at_rating
    FROM public.users
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rating_timing
    BEFORE INSERT ON public.photo_ratings
    FOR EACH ROW
    EXECUTE FUNCTION set_time_to_rate();

-- View for photographer leaderboard
CREATE OR REPLACE VIEW photographer_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.photographer_influence,
    u.photographer_accuracy_percentage,
    u.photographer_total_ratings,
    u.photographer_accurate_ratings,
    u.photographer_approved_at,
    CASE
        WHEN u.photographer_influence >= 4.0 THEN 'Master'
        WHEN u.photographer_influence >= 3.0 THEN 'Expert'
        WHEN u.photographer_influence >= 2.0 THEN 'Advanced'
        WHEN u.photographer_influence >= 1.5 THEN 'Intermediate'
        ELSE 'Beginner'
    END as photographer_level,
    COUNT(DISTINCT p.id) as photos_uploaded,
    COALESCE(AVG(l.like_count), 0) as avg_likes_per_photo
FROM public.users u
LEFT JOIN public.posts p ON p.user_id = u.id
LEFT JOIN (
    SELECT post_id, COUNT(*) as like_count
    FROM public.likes
    GROUP BY post_id
) l ON l.post_id = p.id
WHERE u.photographer_status = 'approved'
GROUP BY u.id, u.username, u.photographer_influence, u.photographer_accuracy_percentage, 
         u.photographer_total_ratings, u.photographer_accurate_ratings, u.photographer_approved_at
ORDER BY u.photographer_influence DESC;

COMMENT ON VIEW photographer_leaderboard IS 'Shows photographer rankings and stats for leaderboard display';
