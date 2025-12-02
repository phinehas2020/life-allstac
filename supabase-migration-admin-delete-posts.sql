-- Migration to allow admins to delete posts

-- Existing policy: "Users can delete own posts"
-- We need to add a policy for admins to delete any post

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;

CREATE POLICY "Admins can delete any post" ON public.posts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );
