-- Migration: Add Admin Policy for Photographer Approval
-- Allows admins to update photographer_status on users

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can update photographer status" ON public.users;

-- Create policy for admins to update photographer status
CREATE POLICY "Admins can update photographer status" ON public.users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

COMMENT ON POLICY "Admins can update photographer status" ON public.users IS 
    'Allows admins to approve/deny photographer applications by updating photographer_status, photographer_approved_at, and photographer_influence';

