
CREATE OR REPLACE FUNCTION public.purchase_product_wallet(
  p_product_id bigint,
  p_quantity integer DEFAULT 1,
  p_game_id text DEFAULT NULL,
  p_server_id text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_plan_id bigint DEFAULT NULL,
  p_plan_name text DEFAULT NULL,
  p_delivery_address text DEFAULT ''
)
RETURNS TABLE(order_id uuid, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_product public.products%ROWTYPE;
  v_unit_price numeric;
  v_total numeric;
  v_balance numeric;
  v_new_balance numeric;
  v_order_id uuid;
  v_qty integer := GREATEST(COALESCE(p_quantity,1), 1);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Determine unit price (plan overrides product price for digital)
  IF p_plan_id IS NOT NULL THEN
    SELECT price INTO v_unit_price FROM public.digital_plans WHERE id = p_plan_id AND product_id = p_product_id;
    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'Plan not found';
    END IF;
  ELSE
    v_unit_price := v_product.price;
  END IF;

  v_total := v_unit_price * v_qty;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_new_balance := v_balance - v_total;

  UPDATE public.profiles SET wallet_balance = v_new_balance WHERE id = v_user;

  INSERT INTO public.orders (
    user_id, product_id, quantity, price,
    game_id, server_id, game_name, phone_number,
    plan_id, plan_name,
    status, payment_method, delivery_address
  ) VALUES (
    v_user, p_product_id, v_qty, v_total,
    p_game_id, p_server_id, v_product.category, COALESCE(p_phone_number,''),
    p_plan_id, p_plan_name,
    'pending', 'wallet', COALESCE(p_delivery_address,'')
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions
    (user_id, amount, transaction_type, reference_id, description, balance_after)
  VALUES
    (v_user, -v_total, 'purchase', v_order_id,
     'Purchase: ' || COALESCE(v_product.name,'order') ||
       CASE WHEN p_plan_name IS NOT NULL THEN ' — ' || p_plan_name ELSE '' END ||
       ' x' || v_qty,
     v_new_balance);

  RETURN QUERY SELECT v_order_id, v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_product_wallet(bigint,integer,text,text,text,bigint,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.purchase_product_wallet(bigint,integer,text,text,text,bigint,text,text) TO authenticated;
