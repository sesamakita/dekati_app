-- Migration: Add multi-photo JSONB column to complaints table
-- Run this in Supabase SQL Editor:

ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

-- Backfill photo_urls from photo_url if photo_url was saved as a JSON string
UPDATE public.complaints 
SET photo_urls = photo_url::jsonb 
WHERE (photo_urls IS NULL OR photo_urls = '[]'::jsonb) 
  AND photo_url IS NOT NULL 
  AND photo_url LIKE '[%]';

-- Backfill single photo_url into array if standard URL
UPDATE public.complaints 
SET photo_urls = jsonb_build_array(photo_url)
WHERE (photo_urls IS NULL OR photo_urls = '[]'::jsonb) 
  AND photo_url IS NOT NULL 
  AND photo_url NOT LIKE '[%]';
