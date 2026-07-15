
-- 1) Daily points RPC owner check
CREATE OR REPLACE FUNCTION public.get_daily_game_points(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT COALESCE(SUM(points_earned), 0)::integer
    FROM public.game_scores
    WHERE user_id = p_user_id
      AND DATE(created_at) = CURRENT_DATE
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_points_earned(user_id_param uuid, exclude_spin boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_points integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_id_param THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO total_points
  FROM public.point_transactions
  WHERE user_id = user_id_param
    AND DATE(created_at) = CURRENT_DATE
    AND amount > 0
    AND (NOT exclude_spin OR transaction_type != 'spin');
  RETURN total_points;
END;
$function$;

-- 2) Block self-update of daily_credits_reset_date and AI credit columns
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance can only be changed by the server';
  END IF;
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'points can only be changed by the server';
  END IF;
  IF NEW.game_points IS DISTINCT FROM OLD.game_points THEN
    RAISE EXCEPTION 'game_points can only be changed by the server';
  END IF;
  IF NEW.premium_ai_credits IS DISTINCT FROM OLD.premium_ai_credits THEN
    RAISE EXCEPTION 'premium_ai_credits can only be changed by the server';
  END IF;
  IF NEW.daily_ai_credits IS DISTINCT FROM OLD.daily_ai_credits THEN
    RAISE EXCEPTION 'daily_ai_credits can only be changed by the server';
  END IF;
  IF NEW.daily_credits_reset_date IS DISTINCT FROM OLD.daily_credits_reset_date THEN
    RAISE EXCEPTION 'daily_credits_reset_date can only be changed by the server';
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'account_status can only be changed by admins';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code cannot be changed';
  END IF;
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referred_by cannot be changed';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Order price validation trigger
CREATE OR REPLACE FUNCTION public.validate_order_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expected_unit numeric;
  qty integer := COALESCE(NEW.quantity, 1);
  submitted numeric := COALESCE(NEW.price, 0);
  expected_total numeric;
BEGIN
  -- Allow server-side (service_role) or admin operations to bypass
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF qty <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  IF NEW.plan_id IS NOT NULL THEN
    SELECT price INTO expected_unit
    FROM public.digital_product_plans
    WHERE id = NEW.plan_id AND product_id = NEW.product_id AND is_active = true;
    IF expected_unit IS NULL THEN
      RAISE EXCEPTION 'Invalid or inactive plan for this product';
    END IF;
  ELSE
    SELECT price INTO expected_unit
    FROM public.products
    WHERE id = NEW.product_id;
    IF expected_unit IS NULL THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
  END IF;

  expected_total := expected_unit * qty;

  IF ABS(submitted - expected_total) > 0.01 THEN
    RAISE EXCEPTION 'Order price % does not match catalog price %', submitted, expected_total;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_order_price ON public.orders;
CREATE TRIGGER trg_validate_order_price
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_price();

-- 4) Game redemption integrity: enforce catalog values and pending status on user inserts
CREATE OR REPLACE FUNCTION public.validate_game_redemption()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ri public.game_reward_items%ROWTYPE;
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.reward_item_id IS NULL THEN
    RAISE EXCEPTION 'reward_item_id is required';
  END IF;

  SELECT * INTO ri FROM public.game_reward_items WHERE id = NEW.reward_item_id;
  IF NOT FOUND OR NOT ri.is_active THEN
    RAISE EXCEPTION 'Invalid or inactive reward item';
  END IF;

  IF NEW.cost_points IS DISTINCT FROM ri.cost_points THEN
    RAISE EXCEPTION 'cost_points must match reward catalog';
  END IF;
  IF NEW.reward_value IS DISTINCT FROM ri.reward_value THEN
    RAISE EXCEPTION 'reward_value must match reward catalog';
  END IF;
  IF NEW.reward_type IS DISTINCT FROM ri.reward_type THEN
    RAISE EXCEPTION 'reward_type must match reward catalog';
  END IF;
  IF NEW.reward_name IS DISTINCT FROM ri.name THEN
    NEW.reward_name := ri.name;
  END IF;
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'New redemptions must start as pending';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_game_redemption ON public.game_redemptions;
CREATE TRIGGER trg_validate_game_redemption
BEFORE INSERT ON public.game_redemptions
FOR EACH ROW EXECUTE FUNCTION public.validate_game_redemption();
