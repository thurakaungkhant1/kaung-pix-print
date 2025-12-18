-- Add check constraints on profiles.points to prevent manipulation
-- This adds an additional layer of protection for SECURITY DEFINER functions

-- Add constraint to ensure points are never negative
ALTER TABLE public.profiles
ADD CONSTRAINT points_non_negative CHECK (points >= 0);

-- Add constraint to ensure points don't exceed a reasonable maximum (1 million)
ALTER TABLE public.profiles
ADD CONSTRAINT points_reasonable_max CHECK (points <= 1000000);