-- Create promotional banners table
CREATE TABLE public.promotional_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  description text,
  badge_text text,
  gradient_from text NOT NULL DEFAULT 'rose-500',
  gradient_via text DEFAULT 'pink-500',
  gradient_to text NOT NULL DEFAULT 'orange-400',
  icon_name text NOT NULL DEFAULT 'Percent',
  link_url text NOT NULL DEFAULT '/physical-products',
  link_text text NOT NULL DEFAULT 'Shop Now',
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active banners" 
ON public.promotional_banners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all banners" 
ON public.promotional_banners 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert banners" 
ON public.promotional_banners 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banners" 
ON public.promotional_banners 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banners" 
ON public.promotional_banners 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_promotional_banners_updated_at
BEFORE UPDATE ON public.promotional_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default banners
INSERT INTO public.promotional_banners (title, subtitle, description, badge_text, gradient_from, gradient_via, gradient_to, icon_name, link_url, link_text, display_order) VALUES
('Flash Sale', NULL, 'Up to 30% off on selected items', 'Limited Time', 'rose-500', 'pink-500', 'orange-400', 'Percent', '/physical-products', 'Shop Now', 1),
('Go Premium', NULL, 'Unlock exclusive benefits today', 'Special Offer', 'violet-600', 'purple-600', 'indigo-600', 'Crown', '/premium-shop', 'Learn More', 2),
('Fresh Stock', NULL, 'Check out what''s new this week', 'New Arrivals', 'emerald-500', 'teal-500', 'cyan-500', 'Package', '/physical-products', 'Explore', 3);