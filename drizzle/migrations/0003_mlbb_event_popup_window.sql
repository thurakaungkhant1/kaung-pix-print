ALTER TABLE public.mlbb_events
  ADD COLUMN IF NOT EXISTS popup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS popup_ends_at timestamptz;
ALTER TABLE public.mlbb_events ADD CONSTRAINT mlbb_events_popup_window_chk
  CHECK (NOT popup_enabled OR (popup_starts_at IS NOT NULL AND popup_ends_at IS NOT NULL AND popup_ends_at > popup_starts_at));
CREATE INDEX IF NOT EXISTS mlbb_events_popup_idx ON public.mlbb_events (popup_ends_at) WHERE popup_enabled;