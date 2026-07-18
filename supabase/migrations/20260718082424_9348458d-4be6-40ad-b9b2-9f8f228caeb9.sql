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
      (d.user_id, d.amount, 'deposit', d.id, 'Deposit approved', new_balance);

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

  ELSE
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