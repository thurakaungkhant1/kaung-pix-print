-- Create table for managing PropellerAds placements
CREATE TABLE public.ad_placements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  placement_type text NOT NULL DEFAULT 'banner', -- banner, interstitial, push, native
  zone_id text, -- PropellerAds Zone ID
  script_code text, -- Full script code if needed
  page_location text NOT NULL, -- home, photo, shop, account, etc.
  position text NOT NULL DEFAULT 'bottom', -- top, bottom, inline, floating
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

-- Policies for admin management
CREATE POLICY "Admins can manage ad placements"
ON public.ad_placements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view active placements
CREATE POLICY "Anyone can view active ad placements"
ON public.ad_placements
FOR SELECT
USING (is_active = true);

-- Create updated_at trigger
CREATE TRIGGER update_ad_placements_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();