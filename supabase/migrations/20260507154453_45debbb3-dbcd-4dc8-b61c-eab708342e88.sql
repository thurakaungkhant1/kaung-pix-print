
ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS wallet_exchange_rate numeric NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.game_reward_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  emoji text DEFAULT '🎁',
  cost_points integer NOT NULL CHECK (cost_points > 0),
  reward_type text NOT NULL DEFAULT 'manual' CHECK (reward_type IN ('manual','wallet_credit','shop_coins','premium_days')),
  reward_value numeric NOT NULL DEFAULT 0,
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_reward_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active reward items" ON public.game_reward_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all reward items" ON public.game_reward_items FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert reward items" ON public.game_reward_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update reward items" ON public.game_reward_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete reward items" ON public.game_reward_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER game_reward_items_updated_at
  BEFORE UPDATE ON public.game_reward_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.game_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_item_id uuid REFERENCES public.game_reward_items(id) ON DELETE SET NULL,
  reward_name text NOT NULL,
  cost_points integer NOT NULL,
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','delivered')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON public.game_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own redemptions" ON public.game_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all redemptions" ON public.game_redemptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update redemptions" ON public.game_redemptions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.game_reward_items (name, description, emoji, cost_points, reward_type, reward_value, display_order)
SELECT * FROM (VALUES
  ('500 Ks Wallet Credit', 'Add 500 Ks to wallet', '💰', 5000, 'wallet_credit', 500, 1),
  ('1,000 Ks Wallet Credit', 'Add 1,000 Ks to wallet', '💰', 9500, 'wallet_credit', 1000, 2),
  ('500 Shop Coins', 'Convert to shop coins', '🪙', 250, 'shop_coins', 500, 3),
  ('1,000 Shop Coins', 'Convert to shop coins', '🪙', 450, 'shop_coins', 1000, 4),
  ('Premium 1 Week', 'VIP for 7 days', '👑', 5000, 'premium_days', 7, 5)
) AS v(name, description, emoji, cost_points, reward_type, reward_value, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.game_reward_items);
