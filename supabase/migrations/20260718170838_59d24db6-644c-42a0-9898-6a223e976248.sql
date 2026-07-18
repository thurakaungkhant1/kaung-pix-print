
-- Add telegram message id to deposits
ALTER TABLE public.wallet_deposits
  ADD COLUMN IF NOT EXISTS telegram_message_id bigint;

-- Trigger to notify Telegram on new deposit
CREATE OR REPLACE FUNCTION public.notify_telegram_on_deposit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://ojoenxchuzqonpixomkl.supabase.co/functions/v1/notify-deposit-telegram',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('deposit_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_telegram_on_deposit_insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_on_deposit_insert ON public.wallet_deposits;
CREATE TRIGGER trg_notify_telegram_on_deposit_insert
AFTER INSERT ON public.wallet_deposits
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_on_deposit_insert();

-- RPC used by Telegram webhook (trusted caller: service role + admin chat check).
-- Mirrors admin_process_deposit but skips has_role(auth.uid(),...) since the
-- webhook runs as service_role with no auth.uid().
CREATE OR REPLACE FUNCTION public.telegram_process_deposit(
  p_deposit_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  d public.wallet_deposits%ROWTYPE;
  current_balance numeric;
  new_balance numeric;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role only';
  END IF;

  IF p_action NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO d FROM public.wallet_deposits WHERE id = p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF d.status <> 'pending' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_pending', 'status', d.status);
  END IF;

  IF p_action = 'approve' THEN
    PERFORM set_config('app.wallet_bypass', 'on', true);

    SELECT COALESCE(wallet_balance, 0) INTO current_balance
      FROM public.profiles WHERE id = d.user_id FOR UPDATE;
    new_balance := current_balance + d.amount;

    UPDATE public.profiles SET wallet_balance = new_balance WHERE id = d.user_id;

    UPDATE public.wallet_deposits
       SET status = 'approved',
           approved_at = now(),
           updated_at = now()
     WHERE id = d.id;

    INSERT INTO public.wallet_transactions
      (user_id, amount, transaction_type, reference_id, description, balance_after)
    VALUES
      (d.user_id, d.amount, 'deposit', d.id, 'Deposit approved (Telegram)', new_balance);

    INSERT INTO public.deposit_audit_log
      (deposit_id, user_id, actor_id, action, amount, transaction_id, previous_status, new_status, notes)
    VALUES
      (d.id, d.user_id, NULL, 'approved', d.amount, d.transaction_id, 'pending', 'approved', 'Approved via Telegram');

    INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
    VALUES (
      'ငွေဖြည့်ခြင်း အောင်မြင်ပါသည်',
      'Your deposit of ' || d.amount::text || ' MMK has been approved and added to your wallet.',
      'user', d.user_id, d.user_id
    );

    RETURN jsonb_build_object('ok', true, 'action', 'approved', 'amount', d.amount, 'user_id', d.user_id, 'new_balance', new_balance);

  ELSE
    IF p_notes IS NULL OR btrim(p_notes) = '' THEN
      RAISE EXCEPTION 'Rejection reason is required';
    END IF;

    UPDATE public.wallet_deposits
       SET status = 'rejected',
           admin_notes = p_notes,
           rejected_at = now(),
           updated_at = now()
     WHERE id = d.id;

    INSERT INTO public.deposit_audit_log
      (deposit_id, user_id, actor_id, action, amount, transaction_id, previous_status, new_status, notes)
    VALUES
      (d.id, d.user_id, NULL, 'rejected', d.amount, d.transaction_id, 'pending', 'rejected', p_notes);

    INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
    VALUES (
      'ငွေဖြည့်တောင်းဆိုချက် ငြင်းပယ်ခြင်း',
      'Your deposit request has been rejected. Reason: ' || p_notes,
      'user', d.user_id, d.user_id
    );

    RETURN jsonb_build_object('ok', true, 'action', 'rejected', 'amount', d.amount, 'user_id', d.user_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_process_deposit(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.telegram_process_deposit(uuid, text, text) TO service_role;
