CREATE TABLE public.mini_game_settings (
  game_id text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  points_override integer,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.mini_game_settings TO anon, authenticated;
GRANT ALL ON public.mini_game_settings TO authenticated;
GRANT ALL ON public.mini_game_settings TO service_role;

ALTER TABLE public.mini_game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mini game settings"
  ON public.mini_game_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert mini game settings"
  ON public.mini_game_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update mini game settings"
  ON public.mini_game_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete mini game settings"
  ON public.mini_game_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mini_game_settings_updated_at
  BEFORE UPDATE ON public.mini_game_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();