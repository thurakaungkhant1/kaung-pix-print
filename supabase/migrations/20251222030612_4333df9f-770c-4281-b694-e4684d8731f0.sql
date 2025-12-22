-- Create shop_categories table for organizing premium shop items
CREATE TABLE public.shop_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create shop_items table for premium shop items
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price_mmk numeric NOT NULL DEFAULT 0,
  price_points integer NOT NULL DEFAULT 0,
  image_url text,
  is_premium boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  stock_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_categories
CREATE POLICY "Anyone can view active categories" ON public.shop_categories 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all categories" ON public.shop_categories 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert categories" ON public.shop_categories 
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories" ON public.shop_categories 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories" ON public.shop_categories 
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_items
CREATE POLICY "Anyone can view active items" ON public.shop_items 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all items" ON public.shop_items 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert items" ON public.shop_items 
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update items" ON public.shop_items 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete items" ON public.shop_items 
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_shop_categories_updated_at
  BEFORE UPDATE ON public.shop_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_items_updated_at
  BEFORE UPDATE ON public.shop_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();