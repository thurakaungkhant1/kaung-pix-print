
-- Profile additions for AI credit tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_ai_credits integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS premium_ai_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ai_generations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_credits_reset_date date;

-- AI usage settings additions
ALTER TABLE public.ai_usage_settings
  ADD COLUMN IF NOT EXISTS free_daily_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS premium_daily_limit integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ai_paused boolean NOT NULL DEFAULT false;

-- Premium check helper
CREATE OR REPLACE FUNCTION public.is_premium_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_memberships
    WHERE user_id = _user_id
      AND is_active = true
      AND expires_at > now()
  );
$$;

-- AI styles table
CREATE TABLE IF NOT EXISTS public.ai_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
  prompt_suffix text NOT NULL DEFAULT '',
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active styles"
  ON public.ai_styles FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage ai styles"
  ON public.ai_styles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_styles_updated_at
  BEFORE UPDATE ON public.ai_styles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default styles
INSERT INTO public.ai_styles (key, label, tier, prompt_suffix, display_order) VALUES
  ('realistic', 'Realistic', 'free', ', photorealistic, high detail, natural lighting', 1),
  ('anime', 'Anime', 'free', ', anime style, vibrant colors, detailed line art', 2),
  ('cartoon', 'Cartoon', 'free', ', cartoon style, bold outlines, flat colors', 3),
  ('fantasy', 'Fantasy', 'free', ', fantasy art, magical atmosphere, epic lighting', 4),
  ('cinematic', 'Cinematic', 'premium', ', cinematic lighting, film grain, dramatic composition, 4k', 10),
  ('ultra_realistic', 'Ultra Realistic', 'premium', ', ultra realistic, 8k, sharp focus, professional photography', 11),
  ('cyberpunk', 'Cyberpunk', 'premium', ', cyberpunk, neon lights, futuristic city, blade runner aesthetic', 12),
  ('ghibli', 'Ghibli', 'premium', ', studio ghibli style, soft watercolor, whimsical', 13),
  ('pixar', 'Pixar', 'premium', ', pixar 3d animation style, expressive, colorful', 14),
  ('3d_render', '3D Render', 'premium', ', 3d render, octane, ray tracing, ultra detailed', 15),
  ('neon', 'Neon', 'premium', ', neon glow, vibrant lights, dark background', 16),
  ('luxury_portrait', 'Luxury Portrait', 'premium', ', luxury portrait, fashion photography, elegant lighting', 17),
  ('tiktok_viral', 'TikTok Viral', 'premium', ', trendy social media style, vibrant, eye catching, viral', 18)
ON CONFLICT (key) DO NOTHING;
