-- Fix RLS policy for session photos to ensure photographers can see all photos in their sessions
-- regardless of who uploaded them (though typically it's them).

DROP POLICY IF EXISTS "Photographers can view own session photos" ON public.posts;

CREATE POLICY "Photographers can view own session photos" ON public.posts
    FOR SELECT USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = posts.session_id
            AND sessions.photographer_id = auth.uid()
        )
    );

-- Add index to improve performance of session-based queries
CREATE INDEX IF NOT EXISTS idx_posts_session_id ON public.posts(session_id);
