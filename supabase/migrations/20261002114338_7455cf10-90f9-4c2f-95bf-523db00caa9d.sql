INSERT INTO public.ad_settings (setting_key, setting_value, description, is_public)
VALUES ('usd_to_mmk_rate', '4500', 'MMK value of 1 USD for VPS game products', true)
ON CONFLICT (setting_key) DO NOTHING;