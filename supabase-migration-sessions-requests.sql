-- Migration for Private Sessions and Public Requests

-- 1. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photographer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Photographers can manage their own sessions
DROP POLICY IF EXISTS "Photographers can manage own sessions" ON public.sessions;
CREATE POLICY "Photographers can manage own sessions" ON public.sessions
    FOR ALL USING (auth.uid() = photographer_id);

-- 2. Modify posts table to link to sessions
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Update RLS for posts
-- Existing policy: "Posts are viewable by everyone" (meaning public posts)
-- We need to change this to exclude session posts.
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;

CREATE POLICY "Public posts are viewable by everyone" ON public.posts
    FOR SELECT USING (session_id IS NULL);

-- Policy for photographers to see their session photos
DROP POLICY IF EXISTS "Photographers can view own session photos" ON public.posts;
CREATE POLICY "Photographers can view own session photos" ON public.posts
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Modify events table to support requests
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('event', 'request')) DEFAULT 'event';

-- 4. Function to verify session access and get photos
CREATE OR REPLACE FUNCTION get_session_photos(p_session_id UUID, p_password TEXT)
RETURNS SETOF public.posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT (password_hash = p_password) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_valid THEN
    RETURN QUERY SELECT * FROM public.posts WHERE session_id = p_session_id ORDER BY created_at DESC;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Grant execute to public/anon
GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO service_role;

-- Also need a function to get session details (title) if password is correct
CREATE OR REPLACE FUNCTION get_session_details(p_session_id UUID, p_password TEXT)
RETURNS TABLE (id UUID, title TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.created_at
  FROM public.sessions s
  WHERE s.id = p_session_id AND s.password_hash = p_password;
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO service_role;
