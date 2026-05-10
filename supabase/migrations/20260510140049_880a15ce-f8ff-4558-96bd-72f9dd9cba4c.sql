-- AI Suite tables
CREATE TABLE public.ai_usage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_cost_coins integer NOT NULL DEFAULT 50,
  gift_cost_coins integer NOT NULL DEFAULT 100,
  invitation_price_mmk numeric NOT NULL DEFAULT 1000,
  daily_photo_limit integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_usage_settings DEFAULT VALUES;

ALTER TABLE public.ai_usage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ai settings" ON public.ai_usage_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage ai settings" ON public.ai_usage_settings FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.ai_photo_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  source_image_url text,
  result_image_url text,
  cost_coins integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_photo_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai photos" ON public.ai_photo_generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai photos" ON public.ai_photo_generations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all ai photos" ON public.ai_photo_generations FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.ai_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invitation_text text NOT NULL,
  theme text NOT NULL DEFAULT 'classic',
  styles jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_style_index integer,
  price_mmk numeric NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'pending',
  paid boolean NOT NULL DEFAULT false,
  payment_proof_url text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own invitations" ON public.ai_invitations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own invitations" ON public.ai_invitations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own invitations" ON public.ai_invitations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all invitations" ON public.ai_invitations FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update invitations" ON public.ai_invitations FOR UPDATE USING (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.ai_gift_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  views integer NOT NULL DEFAULT 0,
  cost_coins integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_gift_links_slug_idx ON public.ai_gift_links(slug);
ALTER TABLE public.ai_gift_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gift link by slug" ON public.ai_gift_links FOR SELECT USING (true);
CREATE POLICY "Users insert own gift links" ON public.ai_gift_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own gift links" ON public.ai_gift_links FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage gift links" ON public.ai_gift_links FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('ai-photos','ai-photos', true),
  ('ai-uploads','ai-uploads', false),
  ('ai-invitations','ai-invitations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ai-photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'ai-photos');
CREATE POLICY "ai-photos auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ai-photos' AND auth.role() = 'authenticated');
CREATE POLICY "ai-invitations public read" ON storage.objects FOR SELECT USING (bucket_id = 'ai-invitations');
CREATE POLICY "ai-invitations auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ai-invitations' AND auth.role() = 'authenticated');
CREATE POLICY "ai-uploads owner read" ON storage.objects FOR SELECT USING (bucket_id = 'ai-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ai-uploads owner insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ai-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);