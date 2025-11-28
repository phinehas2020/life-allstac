-- Add thumbnail_url column to posts table
ALTER TABLE public.posts
ADD COLUMN thumbnail_url TEXT;

-- Update RLS policies if necessary (existing ones cover updates to own posts, so likely fine)
