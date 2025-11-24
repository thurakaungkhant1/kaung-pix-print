-- Create withdrawal settings table for admin configuration
CREATE TABLE public.withdrawal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minimum_points integer NOT NULL DEFAULT 1000,
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  terms_conditions text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view withdrawal settings
CREATE POLICY "Anyone can view withdrawal settings"
ON public.withdrawal_settings
FOR SELECT
USING (true);

-- Only admins can insert/update withdrawal settings
CREATE POLICY "Admins can insert withdrawal settings"
ON public.withdrawal_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawal settings"
ON public.withdrawal_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default withdrawal settings
INSERT INTO public.withdrawal_settings (minimum_points, exchange_rate, terms_conditions, enabled)
VALUES (1000, 1.0, 'Minimum 1,000 points required for withdrawal. Points will be processed within 3-5 business days.', true);