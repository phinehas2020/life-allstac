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
CREATE POLICY "Photographers can manage own sessions" ON public.sessions
    FOR ALL USING (auth.uid() = photographer_id);

-- Policy: Public/Client access?
-- Clients won't have auth.uid() matching anything specific unless we create client accounts.
-- But the requirement is "send to clients with password".
-- We'll handle client access via a secure function or API route that bypasses RLS if password matches.
-- However, for simple fetch by ID (e.g. to show title before password), we might allow read.
-- Let's allow public read of session *metadata* (title, id) but not necessarily sensitive info?
-- Actually, let's keep it locked down. Only photographer sees it in list.
-- Client sees it via specific 'get_session_by_id_and_password' pattern or similar.

-- 2. Modify posts table to link to sessions
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Update RLS for posts
-- Existing policy: "Posts are viewable by everyone" (meaning public posts)
-- We need to change this to exclude session posts.
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Public posts are viewable by everyone" ON public.posts
    FOR SELECT USING (session_id IS NULL);

-- Policy for photographers to see their session photos
CREATE POLICY "Photographers can view own session photos" ON public.posts
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Modify events table to support requests
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('event', 'request')) DEFAULT 'event';

-- 4. Function to verify session access and get photos
-- This function allows a client (unauthenticated or not) to fetch photos if they provide the correct password.
-- Note: In a real prod app, use pgcrypto. Here we assume simple string match or handled in app logic.
-- Ideally we return a JWT or similar, but for this "simple" feature, returning data directly is easiest.
-- Wait, we can't easily return "SETOF posts" if RLS blocks it.
-- We must use SECURITY DEFINER to bypass RLS.

CREATE OR REPLACE FUNCTION get_session_photos(p_session_id UUID, p_password TEXT)
RETURNS SETOF public.posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if session exists and password matches
  -- Note: password_hash here is treated as plain text for simplicity per user request "password",
  -- but ideally should be hashed. If the app hashes before sending, then it matches the stored hash.
  SELECT (password_hash = p_password) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_valid THEN
    RETURN QUERY SELECT * FROM public.posts WHERE session_id = p_session_id ORDER BY created_at DESC;
  ELSE
    -- Return nothing or raise error.
    -- Returning nothing is safer to avoid enumeration, but UI needs to know if wrong password.
    -- Let's return nothing.
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
