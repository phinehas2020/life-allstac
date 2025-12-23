-- Fix RLS policy for session photos to ensure photographers can see all photos in their sessions
-- regardless of who uploaded them (though typically it's them).

-- 1. Ensure 'position' column exists (User reported error: column posts.position does not exist)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Ensure 'update_posts_order' function exists
CREATE OR REPLACE FUNCTION update_posts_order(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE posts
    SET position = (item->>'position')::int
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- 3. Fix RLS Policy
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

-- 4. Add index to improve performance of session-based queries
CREATE INDEX IF NOT EXISTS idx_posts_session_id ON public.posts(session_id);
