-- Update the function to award points when order is approved
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_points integer;
  points_to_award integer;
BEGIN
  -- Proceed if status changed to 'approved' or 'finished'
  IF (NEW.status = 'approved' OR NEW.status = 'finished') 
     AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'finished')) THEN
    
    -- Get the product's points_value
    SELECT points_value INTO product_points
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Calculate points to award (points_value * quantity)
    points_to_award := product_points * NEW.quantity;
    
    -- Update user's points
    UPDATE public.profiles
    SET points = points + points_to_award
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
      points_to_award,
      'purchase',
      'Earned ' || points_to_award || ' points from approved order'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically award points when order is updated
CREATE TRIGGER award_points_on_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_order_finish();