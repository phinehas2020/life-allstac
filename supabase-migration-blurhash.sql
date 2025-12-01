-- Add blurhash column to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "blurhash" text;
