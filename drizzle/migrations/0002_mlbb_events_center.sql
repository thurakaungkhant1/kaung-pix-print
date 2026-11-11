CREATE TABLE public.mlbb_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_key text GENERATED ALWAYS AS (lower(regexp_replace(title, '[^a-zA-Z0-9]+', '', 'g'))) STORED,
  category text NOT NULL DEFAULT 'special'
    CHECK (category IN ('skins','starlight','diamond','recharge','collab','special','esports')),
  description text,
  image_url text,
  image_permitted boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  verification text NOT NULL DEFAULT 'tentative' CHECK (verification IN ('verified','tentative')),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','hidden')),
  source_name text,
  source_url text,
  evidence text,
  show_topup boolean NOT NULL DEFAULT true,
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','sync')),
  needs_review boolean NOT NULL DEFAULT false,
  schedule_changed_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mlbb_events_dates_order CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT mlbb_events_title_len CHECK (char_length(title) BETWEEN 1 AND 200)
);
CREATE INDEX mlbb_events_title_key_idx ON public.mlbb_events (title_key);
CREATE INDEX mlbb_events_public_idx ON public.mlbb_events (review_status, ends_at);

GRANT SELECT ON public.mlbb_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mlbb_events TO authenticated;
GRANT ALL ON public.mlbb_events TO service_role;
ALTER TABLE public.mlbb_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved MLBB events" ON public.mlbb_events
  FOR SELECT TO anon, authenticated USING (review_status = 'approved');
CREATE POLICY "Admins can view all MLBB events" ON public.mlbb_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add MLBB events" ON public.mlbb_events
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can edit MLBB events" ON public.mlbb_events
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete MLBB events" ON public.mlbb_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mlbb_events_updated_at BEFORE UPDATE ON public.mlbb_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mlbb_event_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'schedule' CHECK (trigger IN ('schedule','manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','error')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  articles_checked integer NOT NULL DEFAULT 0,
  articles_analyzed integer NOT NULL DEFAULT 0,
  events_found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  unchanged integer NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  triggered_by uuid
);
CREATE INDEX mlbb_event_sync_runs_started_idx ON public.mlbb_event_sync_runs (started_at DESC);
GRANT SELECT ON public.mlbb_event_sync_runs TO authenticated;
GRANT ALL ON public.mlbb_event_sync_runs TO service_role;
ALTER TABLE public.mlbb_event_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view MLBB sync history" ON public.mlbb_event_sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mlbb_event_source_items (
  url text PRIMARY KEY,
  source_name text NOT NULL,
  title text,
  published_on date,
  content_hash text,
  analyzed_at timestamptz,
  events_found integer NOT NULL DEFAULT 0,
  last_error text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mlbb_event_source_items TO authenticated;
GRANT ALL ON public.mlbb_event_source_items TO service_role;
ALTER TABLE public.mlbb_event_source_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view MLBB source articles" ON public.mlbb_event_source_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.mlbb_events_last_sync()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(finished_at) FROM public.mlbb_event_sync_runs WHERE status IN ('success','partial')
$$;
REVOKE ALL ON FUNCTION public.mlbb_events_last_sync() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mlbb_events_last_sync() TO anon, authenticated, service_role;