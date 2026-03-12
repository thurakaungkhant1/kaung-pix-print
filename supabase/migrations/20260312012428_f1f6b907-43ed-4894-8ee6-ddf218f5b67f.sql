
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  product_points integer;
  points_to_award integer;
BEGIN
  IF (NEW.status = 'approved' OR NEW.status = 'finished') 
     AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'finished')) THEN
    
    SELECT points_value INTO product_points
    FROM public.products
    WHERE id = NEW.product_id;
    
    points_to_award := product_points * NEW.quantity;
    
    IF points_to_award > 0 THEN
      UPDATE public.profiles
      SET points = points + points_to_award
      WHERE id = NEW.user_id;
      
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
        'Earned ' || points_to_award || ' coins from approved order'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_order_finish();
