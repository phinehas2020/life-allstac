-- Add position column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Function to update multiple post positions
-- Security: SECURITY INVOKER ensures it runs with the user's permissions, respecting RLS.
CREATE OR REPLACE FUNCTION update_posts_order(updates jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Only update if the user has permission (RLS on posts table will handle this via WHERE clause if needed,
    -- but usually RLS is on the table level. The UPDATE here targets specific IDs.)
    -- Note: Inside a function, we must be careful. By default plpgsql matches RLS if not SECURITY DEFINER.
    UPDATE posts
    SET position = (item->>'position')::int
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
