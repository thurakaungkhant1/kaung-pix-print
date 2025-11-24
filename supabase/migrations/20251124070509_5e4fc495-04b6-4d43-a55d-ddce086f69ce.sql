-- Add download_pin column to profiles table
ALTER TABLE public.profiles
ADD COLUMN download_pin TEXT;

-- Create index for faster PIN lookups
CREATE INDEX idx_profiles_download_pin ON public.profiles(id, download_pin);

-- Update RLS policy to allow users to update their own PIN
-- The existing "Users can update their own profile" policy already covers this