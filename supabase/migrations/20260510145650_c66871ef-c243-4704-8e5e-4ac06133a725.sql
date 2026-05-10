-- Add thumbnail to passport prompts
ALTER TABLE public.passport_photo_prompts ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Popular prompts collection (replaces invitation feature)
CREATE TABLE IF NOT EXISTS public.popular_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text NOT NULL,
  prompt text NOT NULL,
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popular_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active popular prompts"
ON public.popular_prompts FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage popular prompts"
ON public.popular_prompts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_popular_prompts_updated_at
BEFORE UPDATE ON public.popular_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set photo cost to 0 (free generation)
UPDATE public.ai_usage_settings SET photo_cost_coins = 0;