-- Create physical_categories table for physical products
CREATE TABLE public.physical_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id column to products table for physical product categories
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS physical_category_id UUID REFERENCES public.physical_categories(id) ON DELETE SET NULL;

-- Add stock_quantity and status columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available' CHECK (status IN ('available', 'out_of_stock'));

-- Enable RLS on physical_categories
ALTER TABLE public.physical_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for physical_categories
CREATE POLICY "Anyone can view active physical categories" 
  ON public.physical_categories FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can view all physical categories" 
  ON public.physical_categories FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert physical categories" 
  ON public.physical_categories FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update physical categories" 
  ON public.physical_categories FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete physical categories" 
  ON public.physical_categories FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_physical_categories_updated_at
  BEFORE UPDATE ON public.physical_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default physical categories
INSERT INTO public.physical_categories (name, description, display_order) VALUES
  ('Electronics', 'Phones, laptops, accessories', 1),
  ('Gaming Gear', 'Controllers, headsets, gaming accessories', 2),
  ('Accessories', 'Phone cases, chargers, cables', 3),
  ('Merchandise', 'T-shirts, mugs, collectibles', 4);