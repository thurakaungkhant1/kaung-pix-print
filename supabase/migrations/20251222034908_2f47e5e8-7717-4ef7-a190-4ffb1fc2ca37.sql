-- Add is_premium column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;