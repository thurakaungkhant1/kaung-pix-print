
CREATE TABLE IF NOT EXISTS public.chat_earning_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT true,
  require_vpn boolean NOT NULL DEFAULT true,
  home_country text NOT NULL DEFAULT 'MM',
  reward_per_message integer NOT NULL DEFAULT 1,
  daily_cap integer NOT NULL DEFAULT 20,
  min_message_length integer NOT NULL DEFAULT 2,
  cooldown_seconds integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chat_earning_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.chat_earning_settings TO authenticated;
GRANT ALL ON public.chat_earning_settings TO service_role;

ALTER TABLE public.chat_earning_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_earning_settings_read_all"
  ON public.chat_earning_settings FOR SELECT
  USING (true);

CREATE POLICY "chat_earning_settings_admin_write"
  ON public.chat_earning_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.chat_earning_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.auth_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  error_message text,
  error_code text,
  user_agent text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.auth_error_logs TO anon, authenticated;
GRANT SELECT, DELETE ON public.auth_error_logs TO authenticated;
GRANT ALL ON public.auth_error_logs TO service_role;

ALTER TABLE public.auth_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_error_logs_anyone_insert"
  ON public.auth_error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "auth_error_logs_admin_select"
  ON public.auth_error_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "auth_error_logs_admin_delete"
  ON public.auth_error_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
