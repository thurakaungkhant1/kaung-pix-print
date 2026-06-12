
-- Digital product plans
CREATE TABLE public.digital_product_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id integer NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_label text,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.digital_product_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_product_plans TO authenticated;
GRANT ALL ON public.digital_product_plans TO service_role;

ALTER TABLE public.digital_product_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
ON public.digital_product_plans FOR SELECT
USING (true);

CREATE POLICY "Admins can insert plans"
ON public.digital_product_plans FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.digital_product_plans FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
ON public.digital_product_plans FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_digital_product_plans_updated_at
BEFORE UPDATE ON public.digital_product_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_digital_product_plans_product ON public.digital_product_plans(product_id);

-- Add plan tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.digital_product_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_name text;
