-- Add category field to photos table
ALTER TABLE public.photos
ADD COLUMN category text DEFAULT 'General';