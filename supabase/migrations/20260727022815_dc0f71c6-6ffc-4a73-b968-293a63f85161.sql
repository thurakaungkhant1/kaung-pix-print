CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(p_user_id uuid, p_amount numeric, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
  v_balance numeric;
  v_new numeric;
BEGIN
  IF NOT public.has_role(actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;
  IF p_amount < -10000000 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'Amount out of range';
  END IF;

  PERFORM set_config('app.wallet_bypass', 'on', true);

  SELECT COALESCE(wallet_balance, 0) INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_new := v_balance + p_amount;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles SET wallet_balance = v_new WHERE id = p_user_id;

  INSERT INTO public.wallet_transactions
    (user_id, amount, transaction_type, reference_id, description, balance_after)
  VALUES
    (p_user_id, p_amount, CASE WHEN p_amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END,
     NULL,
     COALESCE(NULLIF(btrim(p_note), ''), CASE WHEN p_amount > 0 THEN 'Admin added funds' ELSE 'Admin withdrew funds' END),
     v_new);

  INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
  VALUES (
    CASE WHEN p_amount > 0 THEN 'Wallet ငွေဖြည့်ခြင်း' ELSE 'Wallet ငွေထုတ်ခြင်း' END,
    'Admin မှ သင်၏ wallet ကို ' || p_amount::text || ' Ks ပြင်ဆင်လိုက်ပါသည်။ လက်ကျန်ငွေ: ' || v_new::text || ' Ks',
    'user', p_user_id, actor
  );

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO authenticated;