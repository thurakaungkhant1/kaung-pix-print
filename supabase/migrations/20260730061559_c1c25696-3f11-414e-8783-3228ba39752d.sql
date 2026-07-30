CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  label text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.feature_flags TO anon;
GRANT SELECT, INSERT, UPDATE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_public_read" ON public.feature_flags;
CREATE POLICY "feature_flags_public_read" ON public.feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_flags_admin_insert" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_insert" ON public.feature_flags FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "feature_flags_admin_update" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_update" ON public.feature_flags FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.feature_flags (key, enabled, label)
VALUES ('mobile_services', true, 'Mobile Services (Shop tab)')
ON CONFLICT (key) DO NOTHING;