-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update sessions table handling
-- We want to automatically hash passwords on insert/update
CREATE OR REPLACE FUNCTION public.hash_session_password()
RETURNS TRIGGER AS $$
BEGIN
    -- Only hash if it's not already a bcrypt hash (starts with $2a$ or $2b$ or $2y$)
    -- And if it's not null/empty
    IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2%' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hash_session_password ON public.sessions;

CREATE TRIGGER trigger_hash_session_password
    BEFORE INSERT OR UPDATE OF password_hash ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.hash_session_password();

-- Update existing plain-text passwords to bcrypt hashes
UPDATE public.sessions
SET password_hash = crypt(password_hash, gen_salt('bf'))
WHERE password_hash NOT LIKE '$2%';

-- Update RPC functions to verify against hash
CREATE OR REPLACE FUNCTION get_session_photos(p_session_id UUID, p_password TEXT)
RETURNS SETOF public.posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if session exists and password matches
  -- Use crypt to verify against stored hash
  SELECT (password_hash = crypt(p_password, password_hash)) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_valid THEN
    RETURN QUERY SELECT * FROM public.posts WHERE session_id = p_session_id ORDER BY created_at DESC;
  ELSE
    RETURN; -- Return nothing if invalid
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_details(p_session_id UUID, p_password TEXT)
RETURNS TABLE (id UUID, title TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.created_at
  FROM public.sessions s
  WHERE s.id = p_session_id AND s.password_hash = crypt(p_password, s.password_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_photos(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_details(UUID, TEXT) TO service_role;
