INSERT INTO public.ad_settings (setting_key, setting_value)
SELECT 'game_interstitial_minutes', '2'
WHERE NOT EXISTS (SELECT 1 FROM public.ad_settings WHERE setting_key = 'game_interstitial_minutes');