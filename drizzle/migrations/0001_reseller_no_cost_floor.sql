CREATE OR REPLACE FUNCTION public.purchase_kg_reseller(p_user_id uuid, p_product_id bigint, p_discount_mmk numeric, p_game_id text, p_server_id text, p_player_name text)
RETURNS TABLE(order_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_total numeric; v_balance numeric; v_new numeric; v_order uuid; v_game_name text; v_player text;
BEGIN
  PERFORM set_config('app.wallet_bypass', 'on', true);
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  v_total := GREATEST(v_product.price - GREATEST(COALESCE(p_discount_mmk,0),0), 0);
  v_player := NULLIF(btrim(COALESCE(p_player_name,'')),'');
  v_game_name := v_product.category || CASE WHEN v_player IS NOT NULL THEN ' (' || left(v_player,60) || ')' ELSE '' END;
  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_total THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_new := v_balance - v_total;
  UPDATE public.profiles SET wallet_balance = v_new WHERE id = p_user_id;
  INSERT INTO public.orders (user_id, product_id, quantity, price, game_id, server_id, game_name, phone_number, plan_name, status, payment_method, delivery_address)
  VALUES (p_user_id, p_product_id, 1, v_total, p_game_id, p_server_id, v_game_name, '', v_product.name, 'pending', 'wallet', '')
  RETURNING id INTO v_order;
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, reference_id, description, balance_after)
  VALUES (p_user_id, -v_total, 'purchase', v_order, 'Purchase: ' || v_product.name || ' x1 (reseller)', v_new);
  RETURN QUERY SELECT v_order, v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_kg_reseller(uuid, bigint, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_kg_reseller(uuid, bigint, numeric, text, text, text) TO service_role;