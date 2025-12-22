-- Add transaction_id column to orders table for storing last 6 digits of transaction ID
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id text;