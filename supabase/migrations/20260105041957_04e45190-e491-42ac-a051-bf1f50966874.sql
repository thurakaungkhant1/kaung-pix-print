-- Create mobile_operators table
CREATE TABLE public.mobile_operators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_operators ENABLE ROW LEVEL SECURITY;

-- Anyone can view active operators
CREATE POLICY "Anyone can view active operators"
ON public.mobile_operators
FOR SELECT
USING (is_active = true);

-- Admins can view all operators
CREATE POLICY "Admins can view all operators"
ON public.mobile_operators
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert operators
CREATE POLICY "Admins can insert operators"
ON public.mobile_operators
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update operators
CREATE POLICY "Admins can update operators"
ON public.mobile_operators
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete operators
CREATE POLICY "Admins can delete operators"
ON public.mobile_operators
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default operators
INSERT INTO public.mobile_operators (name, code, display_order) VALUES
  ('MPT', 'mpt', 1),
  ('Ooredoo', 'ooredoo', 2),
  ('Mytel', 'mytel', 3),
  ('Atom', 'atom', 4);