-- Create payment_methods table for admin-controlled payment options
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_name TEXT,
  account_number TEXT NOT NULL,
  icon_name TEXT DEFAULT 'CreditCard',
  gradient_color TEXT DEFAULT 'from-blue-500 to-blue-600',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Anyone can view active payment methods
CREATE POLICY "Anyone can view active payment methods"
ON public.payment_methods
FOR SELECT
USING (is_active = true);

-- Admins can view all payment methods
CREATE POLICY "Admins can view all payment methods"
ON public.payment_methods
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert payment methods
CREATE POLICY "Admins can insert payment methods"
ON public.payment_methods
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update payment methods
CREATE POLICY "Admins can update payment methods"
ON public.payment_methods
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete payment methods
CREATE POLICY "Admins can delete payment methods"
ON public.payment_methods
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment methods
INSERT INTO public.payment_methods (name, account_name, account_number, icon_name, gradient_color, display_order)
VALUES 
  ('KBZ Pay', NULL, '09694577177', 'Phone', 'from-blue-500 to-blue-600', 1),
  ('Wave Pay', NULL, '09694577177', 'CreditCard', 'from-yellow-500 to-orange-500', 2),
  ('CB Pay', NULL, '0211600900000647', 'Wallet', 'from-emerald-500 to-teal-500', 3);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();