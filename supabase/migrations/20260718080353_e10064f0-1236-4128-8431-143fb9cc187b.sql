
-- 1. Add rejected_by column for symmetry with approved_by
ALTER TABLE public.wallet_deposits
  ADD COLUMN IF NOT EXISTS rejected_by uuid;

-- 2. Deposit audit log
CREATE TABLE IF NOT EXISTS public.deposit_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES public.wallet_deposits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('approved','rejected')),
  amount numeric NOT NULL DEFAULT 0,
  transaction_id text,
  previous_status text,
  new_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_audit_log_deposit_id_idx
  ON public.deposit_audit_log(deposit_id);
CREATE INDEX IF NOT EXISTS deposit_audit_log_created_at_idx
  ON public.deposit_audit_log(created_at DESC);

GRANT SELECT ON public.deposit_audit_log TO authenticated;
GRANT ALL ON public.deposit_audit_log TO service_role;

ALTER TABLE public.deposit_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deposit audit log"
ON public.deposit_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Admin per-user notification preferences
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  user_id uuid PRIMARY KEY,
  deposit_sound_enabled boolean NOT NULL DEFAULT true,
  deposit_badge_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_notification_settings TO authenticated;
GRANT ALL ON public.admin_notification_settings TO service_role;

ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own notification prefs"
ON public.admin_notification_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_admin_notification_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_admin_notif_settings ON public.admin_notification_settings;
CREATE TRIGGER trg_touch_admin_notif_settings
BEFORE UPDATE ON public.admin_notification_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_notification_settings();

-- 4. Server-side approve/reject function
CREATE OR REPLACE FUNCTION public.admin_process_deposit(
  p_deposit_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.wallet_deposits%ROWTYPE;
  current_balance numeric;
  new_balance numeric;
  actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF p_action NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO d FROM public.wallet_deposits WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF d.status <> 'pending' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_pending', 'deposit_id', p_deposit_id);
  END IF;

  IF p_action = 'approve' THEN
    SELECT COALESCE(wallet_balance, 0) INTO current_balance
      FROM public.profiles WHERE id = d.user_id FOR UPDATE;
    new_balance := current_balance + d.amount;

    UPDATE public.profiles
       SET wallet_balance = new_balance
     WHERE id = d.user_id;

    UPDATE public.wallet_deposits
       SET status = 'approved',
           admin_notes = COALESCE(NULLIF(p_notes,''), admin_notes),
           approved_by = actor,
           approved_at = now(),
           updated_at = now()
     WHERE id = d.id;

    INSERT INTO public.wallet_transactions
      (user_id, amount, transaction_type, reference_id, description, balance_after)
    VALUES
      (d.user_id, d.amount, 'deposit', d.id::text, 'Deposit approved', new_balance);

    INSERT INTO public.deposit_audit_log
      (deposit_id, user_id, actor_id, action, amount, transaction_id, previous_status, new_status, notes)
    VALUES
      (d.id, d.user_id, actor, 'approved', d.amount, d.transaction_id, 'pending', 'approved', p_notes);

    INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
    VALUES (
      'ငွေဖြည့်ခြင်း အောင်မြင်ပါသည်',
      'သင်၏ ငွေဖြည့်တောင်းဆိုချက် ' || d.amount::text || ' Ks ကို အတည်ပြုပြီးပါပြီ။',
      'user', d.user_id, actor
    );

    RETURN jsonb_build_object('ok', true, 'action', 'approved', 'deposit_id', d.id, 'new_balance', new_balance);

  ELSE -- reject
    IF p_notes IS NULL OR btrim(p_notes) = '' THEN
      RAISE EXCEPTION 'Rejection reason is required';
    END IF;

    UPDATE public.wallet_deposits
       SET status = 'rejected',
           admin_notes = p_notes,
           rejected_by = actor,
           rejected_at = now(),
           updated_at = now()
     WHERE id = d.id;

    INSERT INTO public.deposit_audit_log
      (deposit_id, user_id, actor_id, action, amount, transaction_id, previous_status, new_status, notes)
    VALUES
      (d.id, d.user_id, actor, 'rejected', d.amount, d.transaction_id, 'pending', 'rejected', p_notes);

    INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
    VALUES (
      'ငွေဖြည့်တောင်းဆိုချက် ငြင်းပယ်ခြင်း',
      'သင်၏ ' || d.amount::text || ' Ks ငွေဖြည့်တောင်းဆိုချက်ကို ငြင်းပယ်လိုက်ပါသည်။ အကြောင်းရင်း: ' || p_notes,
      'user', d.user_id, actor
    );

    RETURN jsonb_build_object('ok', true, 'action', 'rejected', 'deposit_id', d.id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_deposit(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_deposit(uuid, text, text) TO authenticated;
