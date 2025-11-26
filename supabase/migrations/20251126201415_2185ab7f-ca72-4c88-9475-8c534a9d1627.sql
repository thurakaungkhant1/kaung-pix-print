-- Add shooting_date field to photos table for admin-managed photo date
ALTER TABLE public.photos 
ADD COLUMN shooting_date date;