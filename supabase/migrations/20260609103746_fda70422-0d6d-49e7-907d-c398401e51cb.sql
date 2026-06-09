
-- 1) Photos: add requires_pin flag
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS requires_pin boolean NOT NULL DEFAULT false;

-- Backfill requires_pin from existing download_pin column
UPDATE public.photos
  SET requires_pin = true
  WHERE download_pin IS NOT NULL AND length(trim(download_pin)) > 0;

-- 2) photo_pins: admin-only PIN storage
CREATE TABLE IF NOT EXISTS public.photo_pins (
  photo_id integer PRIMARY KEY REFERENCES public.photos(id) ON DELETE CASCADE,
  pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.photo_pins TO service_role;
-- Intentionally no grants to anon/authenticated; PIN is read only via edge function (service role)

ALTER TABLE public.photo_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage photo_pins" ON public.photo_pins;
CREATE POLICY "Admins manage photo_pins"
  ON public.photo_pins
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill photo_pins from existing photos.download_pin
INSERT INTO public.photo_pins (photo_id, pin)
SELECT id, download_pin
FROM public.photos
WHERE download_pin IS NOT NULL
  AND length(trim(download_pin)) > 0
ON CONFLICT (photo_id) DO UPDATE SET pin = EXCLUDED.pin, updated_at = now();

-- 3) Products: admin-controllable diamond tier
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS diamond_tier text;
