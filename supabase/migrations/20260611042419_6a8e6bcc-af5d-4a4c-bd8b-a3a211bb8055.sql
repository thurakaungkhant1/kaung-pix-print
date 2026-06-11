
-- MLBB diamond tiers (admin-editable categories)
CREATE TABLE public.mlbb_diamond_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text DEFAULT '💎',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mlbb_diamond_tiers TO anon, authenticated;
GRANT ALL ON public.mlbb_diamond_tiers TO authenticated;
GRANT ALL ON public.mlbb_diamond_tiers TO service_role;
ALTER TABLE public.mlbb_diamond_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers readable by everyone" ON public.mlbb_diamond_tiers FOR SELECT USING (true);
CREATE POLICY "Admins manage tiers" ON public.mlbb_diamond_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mlbb_diamond_tiers (slug, label, emoji, display_order) VALUES
  ('special', 'Special Offers', '🎁', 1),
  ('starter', 'Starter Packs', '✨', 2),
  ('popular', 'Popular Packs', '💎', 3),
  ('pro', 'Pro Packs', '🔥', 4),
  ('mega', 'Mega Packs', '👑', 5);

-- Support chat (user <-> admin)
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_user_idx ON public.support_messages (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own thread" ON public.support_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users send own messages" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender_role = 'user' AND auth.uid() = user_id)
    OR (sender_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Mark read" ON public.support_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
