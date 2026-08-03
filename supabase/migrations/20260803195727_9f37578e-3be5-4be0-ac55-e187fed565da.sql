ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_fill_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_fill_message text;