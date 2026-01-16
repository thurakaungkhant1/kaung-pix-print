-- Create ad_settings table for interstitial ad configuration
CREATE TABLE public.ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can view ad settings"
ON public.ad_settings
FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage ad settings"
ON public.ad_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.ad_settings (setting_key, setting_value, description)
VALUES 
  ('interstitial_frequency', '3', 'Show interstitial ad every N page navigations'),
  ('interstitial_cooldown', '60', 'Minimum seconds between interstitial ads');

-- Create trigger for updated_at
CREATE TRIGGER update_ad_settings_updated_at
BEFORE UPDATE ON public.ad_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();