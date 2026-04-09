
-- Add game_points to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS game_points integer NOT NULL DEFAULT 0;

-- Game scores table
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  is_win boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores" ON public.game_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all scores" ON public.game_scores FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_game_scores_user ON public.game_scores(user_id, created_at DESC);
CREATE INDEX idx_game_scores_leaderboard ON public.game_scores(game_name, score DESC);

-- Daily missions table
CREATE TABLE public.daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_date date NOT NULL DEFAULT CURRENT_DATE,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  missions_completed boolean NOT NULL DEFAULT false,
  bonus_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_date)
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions" ON public.daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.daily_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.daily_missions FOR UPDATE USING (auth.uid() = user_id);

-- Game streaks table
CREATE TABLE public.game_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_played_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON public.game_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON public.game_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON public.game_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard view
CREATE OR REPLACE VIEW public.game_leaderboard AS
SELECT 
  p.id,
  p.name,
  p.avatar_url,
  p.game_points,
  COUNT(gs.id) as total_games,
  COUNT(CASE WHEN gs.is_win THEN 1 END) as total_wins
FROM public.profiles p
LEFT JOIN public.game_scores gs ON gs.user_id = p.id
GROUP BY p.id, p.name, p.avatar_url, p.game_points
ORDER BY p.game_points DESC;

-- Function to get daily game points
CREATE OR REPLACE FUNCTION public.get_daily_game_points(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points_earned), 0)::integer
  FROM public.game_scores
  WHERE user_id = p_user_id
    AND DATE(created_at) = CURRENT_DATE;
$$;
