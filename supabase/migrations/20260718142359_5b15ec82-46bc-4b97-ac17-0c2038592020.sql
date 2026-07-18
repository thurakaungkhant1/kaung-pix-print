
CREATE OR REPLACE FUNCTION public.refund_wallet_on_order_reject()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_new_balance numeric;
  v_refund numeric;
  v_already boolean;
BEGIN
  -- Only act on transition into rejected/cancelled
  IF NEW.status NOT IN ('rejected','cancelled') THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('rejected','cancelled') THEN
    RETURN NEW;
  END IF;

  -- Only refund wallet-paid orders
  IF COALESCE(NEW.payment_method,'') <> 'wallet' THEN
    RETURN NEW;
  END IF;

  v_refund := COALESCE(NEW.price, 0);
  IF v_refund <= 0 THEN
    RETURN NEW;
  END IF;

  -- Guard against double refund
  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE reference_id = NEW.id AND transaction_type = 'refund'
  ) INTO v_already;
  IF v_already THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.wallet_bypass', 'on', true);

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
  v_new_balance := COALESCE(v_balance, 0) + v_refund;

  UPDATE public.profiles SET wallet_balance = v_new_balance WHERE id = NEW.user_id;

  INSERT INTO public.wallet_transactions
    (user_id, amount, transaction_type, reference_id, description, balance_after)
  VALUES
    (NEW.user_id, v_refund, 'refund', NEW.id,
     'Refund for cancelled order #' || upper(substr(NEW.id::text, 1, 8)),
     v_new_balance);

  INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
  VALUES (
    'ငွေပြန်အမ်းခြင်း',
    'သင်၏ order ကို ငြင်းပယ်လိုက်ပါသဖြင့် ' || v_refund::text || ' Ks ကို wallet သို့ ပြန်ထည့်ပေးလိုက်ပါပြီ။',
    'user', NEW.user_id, COALESCE(auth.uid(), NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_wallet_on_order_reject ON public.orders;
CREATE TRIGGER trg_refund_wallet_on_order_reject
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.refund_wallet_on_order_reject();
