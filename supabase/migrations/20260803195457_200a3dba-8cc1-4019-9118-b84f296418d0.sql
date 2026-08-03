ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_fill_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_fill_status text;