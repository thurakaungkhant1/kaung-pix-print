-- Create table for premium subscription plans
CREATE TABLE public.premium_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  duration_months integer NOT NULL,
  price_points integer NOT NULL,
  price_mmk numeric,
  is_active boolean NOT NULL DEFAULT true,
  plan_type text NOT NULL DEFAULT 'subscription', -- 'subscription' or 'microtransaction'
  badge_text text, -- e.g., 'Popular', 'Best Value'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active premium plans"
ON public.premium_plans
FOR SELECT
USING (is_active = true);

-- Admins can manage all plans
CREATE POLICY "Admins can insert premium plans"
ON public.premium_plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update premium plans"
ON public.premium_plans
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete premium plans"
ON public.premium_plans
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all plans including inactive
CREATE POLICY "Admins can view all premium plans"
ON public.premium_plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Insert default subscription plans
INSERT INTO public.premium_plans (name, description, duration_months, price_points, price_mmk, plan_type, badge_text)
VALUES 
  ('1 Month Premium', 'Access all premium features for 1 month', 1, 500, 5000, 'subscription', NULL),
  ('3 Months Premium', 'Access all premium features for 3 months', 3, 1200, 12000, 'subscription', 'Popular'),
  ('6 Months Premium', 'Access all premium features for 6 months', 6, 2000, 20000, 'subscription', 'Best Value'),
  ('1 Year Premium', 'Access all premium features for 1 year', 12, 3500, 35000, 'subscription', 'Most Savings'),
  ('Mytel 1000MB', 'Mobile data pack reward - earn 0.01 premium points', 0, 100, 1000, 'microtransaction', NULL),
  ('Phone Bill 1000', 'Phone bill top-up - earn 0.01 premium points', 0, 100, 1000, 'microtransaction', NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_premium_plans_updated_at
  BEFORE UPDATE ON public.premium_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();