ALTER TABLE public.ad_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.ad_settings
SET is_public = true
WHERE setting_key IN ('interstitial_frequency', 'interstitial_cooldown');

DROP POLICY IF EXISTS "Public can view non-sensitive ad settings" ON public.ad_settings;

CREATE POLICY "Public can view settings marked public"
ON public.ad_settings
FOR SELECT
USING (is_public = true);