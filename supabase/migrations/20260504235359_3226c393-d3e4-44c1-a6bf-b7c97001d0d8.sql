CREATE TABLE public.game_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_play_points integer NOT NULL DEFAULT 5,
  win_bonus_points integer NOT NULL DEFAULT 20,
  high_score_bonus_points integer NOT NULL DEFAULT 10,
  high_score_threshold integer NOT NULL DEFAULT 100,
  daily_limit integer NOT NULL DEFAULT 500,
  cooldown_seconds integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game settings"
  ON public.game_settings FOR SELECT USING (true);

CREATE POLICY "Admins can insert game settings"
  ON public.game_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update game settings"
  ON public.game_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON public.game_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.game_settings (base_play_points, win_bonus_points, high_score_bonus_points, high_score_threshold, daily_limit, cooldown_seconds)
VALUES (5, 20, 10, 100, 500, 30);