CREATE TABLE public.ad_events (
  id uuid primary key default gen_random_uuid(),
  ad_type text not null default 'interstitial',
  event_type text not null check (event_type in ('impression','click')),
  user_id uuid,
  context text,
  created_at timestamptz not null default now()
);
CREATE INDEX ad_events_created_at_idx ON public.ad_events (created_at desc);
CREATE INDEX ad_events_type_idx ON public.ad_events (ad_type, event_type);
GRANT INSERT ON public.ad_events TO anon, authenticated;
GRANT SELECT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log ad events" ON public.ad_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view ad events" ON public.ad_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));