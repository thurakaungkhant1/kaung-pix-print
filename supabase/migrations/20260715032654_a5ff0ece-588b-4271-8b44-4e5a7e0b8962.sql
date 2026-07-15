CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  product_points integer;
  points_to_award integer;
BEGIN
  IF (NEW.status IN ('approved','finished'))
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved','finished'))
     AND COALESCE(NEW.points_awarded, false) = false THEN

    SELECT points_value INTO product_points FROM public.products WHERE id = NEW.product_id;
    points_to_award := COALESCE(product_points, 0) * COALESCE(NEW.quantity, 1);

    IF points_to_award > 0 THEN
      IF NEW.order_type = 'game' THEN
        UPDATE public.profiles
          SET game_points = COALESCE(game_points,0) + points_to_award
          WHERE id = NEW.user_id;
        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.user_id, points_to_award, 'game_purchase',
                'Earned ' || points_to_award || ' game points from game order');
      ELSE
        UPDATE public.profiles
          SET points = COALESCE(points,0) + points_to_award
          WHERE id = NEW.user_id;
        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.user_id, points_to_award, 'purchase',
                'Earned ' || points_to_award || ' coins from ' || COALESCE(NEW.order_type,'order') || ' order');
      END IF;

      NEW.points_awarded := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;