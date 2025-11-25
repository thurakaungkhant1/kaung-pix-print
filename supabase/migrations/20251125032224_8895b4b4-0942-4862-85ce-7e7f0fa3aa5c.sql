-- Function to check daily points earned (excluding spin)
CREATE OR REPLACE FUNCTION public.get_daily_points_earned(user_id_param uuid, exclude_spin boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_points integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_points
  FROM public.point_transactions
  WHERE user_id = user_id_param
    AND DATE(created_at) = CURRENT_DATE
    AND amount > 0
    AND (NOT exclude_spin OR transaction_type != 'spin');
  
  RETURN total_points;
END;
$$;

-- Updated function to award points with daily cap
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_points integer;
  points_to_award integer;
  daily_points_earned integer;
  remaining_daily_points integer;
  actual_points_awarded integer;
BEGIN
  -- Proceed if status changed to 'approved' or 'finished'
  IF (NEW.status = 'approved' OR NEW.status = 'finished') 
     AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'finished')) THEN
    
    -- Get daily points already earned (excluding spin)
    daily_points_earned := public.get_daily_points_earned(NEW.user_id, true);
    
    -- Calculate remaining points user can earn today (max 5 per day)
    remaining_daily_points := GREATEST(0, 5 - daily_points_earned);
    
    -- Only proceed if user hasn't reached daily cap
    IF remaining_daily_points > 0 THEN
      -- Get the product's points_value
      SELECT points_value INTO product_points
      FROM public.products
      WHERE id = NEW.product_id;
      
      -- Calculate points to award (points_value * quantity)
      points_to_award := product_points * NEW.quantity;
      
      -- Cap the points to the remaining daily limit
      actual_points_awarded := LEAST(points_to_award, remaining_daily_points);
      
      -- Update user's points
      UPDATE public.profiles
      SET points = points + actual_points_awarded
      WHERE id = NEW.user_id;
      
      -- Create point transaction record
      INSERT INTO public.point_transactions (
        user_id,
        amount,
        transaction_type,
        description
      )
      VALUES (
        NEW.user_id,
        actual_points_awarded,
        'purchase',
        'Earned ' || actual_points_awarded || ' points from approved order (daily cap: ' || daily_points_earned + actual_points_awarded || '/5)'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;