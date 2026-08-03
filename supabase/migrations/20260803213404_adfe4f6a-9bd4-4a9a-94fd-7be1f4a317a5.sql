CREATE TABLE IF NOT EXISTS public.game_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text,
  image_url text,
  requires_server_id boolean NOT NULL DEFAULT false,
  nickname_key text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_catalog TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_catalog TO authenticated;
GRANT ALL ON public.game_catalog TO service_role;

ALTER TABLE public.game_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active games"
ON public.game_catalog FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage games"
ON public.game_catalog FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_game_catalog_updated_at
BEFORE UPDATE ON public.game_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.game_catalog (category_key, name, short_name, image_url, requires_server_id, nickname_key, display_order)
VALUES
  ('MLBB Diamonds', 'Mobile Legends', 'MLBB', '/images/games/mobile-legends.png', true, 'ml', 1),
  ('PUBG UC', 'PUBG Mobile', 'PUBG UC', '/images/games/pubg-mobile.png', false, 'pubgm', 2),
  ('Magic Chess Diamonds', 'Magic Chess GoGo', 'Magic Chess', '/images/games/magic-chess.png', true, 'mcgg', 3)
ON CONFLICT (category_key) DO NOTHING;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;