-- Create withdrawal_items table to store exchange options
CREATE TABLE public.withdrawal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  value_amount NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawal_items
ALTER TABLE public.withdrawal_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active withdrawal items
CREATE POLICY "Anyone can view active withdrawal items"
ON public.withdrawal_items
FOR SELECT
USING (is_active = true);

-- Admins can manage withdrawal items
CREATE POLICY "Admins can insert withdrawal items"
ON public.withdrawal_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawal items"
ON public.withdrawal_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete withdrawal items"
ON public.withdrawal_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add withdrawal_item_id to point_withdrawals table
ALTER TABLE public.point_withdrawals
ADD COLUMN withdrawal_item_id UUID REFERENCES public.withdrawal_items(id);

-- Insert default withdrawal items
INSERT INTO public.withdrawal_items (name, description, points_required, value_amount) VALUES
('Cash - $10', 'Exchange 1000 points for $10 cash', 1000, 10),
('Cash - $25', 'Exchange 2500 points for $25 cash', 2500, 25),
('Cash - $50', 'Exchange 5000 points for $50 cash', 5000, 50),
('Cash - $100', 'Exchange 10000 points for $100 cash', 10000, 100);