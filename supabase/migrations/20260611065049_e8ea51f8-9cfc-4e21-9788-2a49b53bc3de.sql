
CREATE TABLE public.chat_reward_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  message_preview text,
  cooldown_remaining integer,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_reward_logs TO authenticated;
GRANT ALL ON public.chat_reward_logs TO service_role;

ALTER TABLE public.chat_reward_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reward log"
  ON public.chat_reward_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reward log"
  ON public.chat_reward_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reward logs"
  ON public.chat_reward_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reward logs"
  ON public.chat_reward_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_chat_reward_logs_user_created ON public.chat_reward_logs (user_id, created_at DESC);
CREATE INDEX idx_chat_reward_logs_reason_created ON public.chat_reward_logs (reason, created_at DESC);
