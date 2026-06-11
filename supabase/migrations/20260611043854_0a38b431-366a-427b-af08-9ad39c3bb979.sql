
CREATE TABLE IF NOT EXISTS public.digital_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'package',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.digital_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_categories TO authenticated;
GRANT ALL ON public.digital_categories TO service_role;

ALTER TABLE public.digital_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active digital categories"
  ON public.digital_categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert digital categories"
  ON public.digital_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update digital categories"
  ON public.digital_categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete digital categories"
  ON public.digital_categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_digital_categories_updated_at
  BEFORE UPDATE ON public.digital_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.digital_categories (name, slug, description, icon, display_order)
VALUES
  ('Software & License Keys', 'software', 'Apps, tools and license keys', 'key', 1),
  ('Streaming Accounts', 'streaming', 'Netflix, Spotify, YouTube Premium', 'tv', 2),
  ('Gift Cards & Vouchers', 'gift-cards', 'Digital gift cards and vouchers', 'gift', 3),
  ('E-books & Courses', 'courses', 'Digital books and online courses', 'book-open', 4)
ON CONFLICT (slug) DO NOTHING;
