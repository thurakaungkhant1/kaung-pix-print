ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS event_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_label text;