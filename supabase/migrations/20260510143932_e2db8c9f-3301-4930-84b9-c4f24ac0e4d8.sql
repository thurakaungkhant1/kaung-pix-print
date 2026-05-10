CREATE TABLE public.passport_photo_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  prompt text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.passport_photo_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active passport prompts"
  ON public.passport_photo_prompts FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage passport prompts"
  ON public.passport_photo_prompts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER passport_photo_prompts_updated_at
  BEFORE UPDATE ON public.passport_photo_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.passport_photo_prompts (name, description, prompt, display_order) VALUES
  ('Standard White Background', 'Classic passport-style photo on plain white background', 'Transform this photo into a professional passport-style portrait. Keep the person''s face exactly the same. Pure plain white background, neutral facial expression, looking straight at camera, head and shoulders centered, even soft studio lighting, no shadows, formal collared shirt, sharp high-resolution, 35x45mm passport photo standard.', 1),
  ('Blue Background', 'Passport photo on light blue background', 'Convert this into an official passport photo. Keep the exact same face and identity. Light blue solid background, formal attire, neutral expression, eyes open and looking forward, even lighting, no shadows on face or background, professional studio quality, 35x45mm proportions.', 2),
  ('Formal Suit', 'Passport photo wearing a formal black suit', 'Create a professional passport photograph from this image. Preserve the person''s exact face, age, and ethnicity. Replace clothing with a formal black suit, white shirt and tie. Plain off-white background, neutral expression, head centered, soft even lighting, no shadows, sharp focus on the face.', 3),
  ('Visa Photo', 'US visa photo style with strict requirements', 'Transform into a US visa photo. Keep the face identical. Pure white background, head straight, both ears visible, neutral closed-mouth expression, eyes open looking at camera, no glasses, no head covering, even lighting, no shadows, formal clothing, 2x2 inch ratio, sharp high-resolution.', 4);