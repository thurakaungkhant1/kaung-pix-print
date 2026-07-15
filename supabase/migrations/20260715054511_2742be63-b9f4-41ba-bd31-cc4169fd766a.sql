CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  product_points integer;
  points_to_award integer := 0;
  awarded_type text := NULL;
  status_changed boolean := false;
BEGIN
  status_changed := (OLD.status IS DISTINCT FROM NEW.status);

  IF (NEW.status IN ('approved','finished'))
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved','finished'))
     AND COALESCE(NEW.points_awarded, false) = false THEN

    SELECT points_value INTO product_points FROM public.products WHERE id = NEW.product_id;
    points_to_award := COALESCE(product_points, 0) * COALESCE(NEW.quantity, 1);

    IF points_to_award > 0 THEN
      IF NEW.order_type = 'game' THEN
        awarded_type := 'game_points';
        UPDATE public.profiles
          SET game_points = COALESCE(game_points,0) + points_to_award
          WHERE id = NEW.user_id;
        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.user_id, points_to_award, 'game_purchase',
                'Earned ' || points_to_award || ' game points from game order');
      ELSE
        awarded_type := 'coins';
        UPDATE public.profiles
          SET points = COALESCE(points,0) + points_to_award
          WHERE id = NEW.user_id;
        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.user_id, points_to_award, 'purchase',
                'Earned ' || points_to_award || ' coins from ' || COALESCE(NEW.order_type,'order') || ' order');
      END IF;

      NEW.points_awarded := true;

      INSERT INTO public.notifications (title, message, target_type, target_user_id, created_by)
      VALUES (
        'Coins ရရှိပါပြီ',
        'လူကြီးမင်း၏ ၀ယ်ယူမှုကြောင့် coin ' || points_to_award || ' ခု ရရှိသွားပါပြီ။',
        'user',
        NEW.user_id,
        COALESCE(auth.uid(), NEW.user_id)
      );
    END IF;
  END IF;

  IF status_changed THEN
    INSERT INTO public.order_approval_audit(
      order_id, user_id, changed_by, previous_status, new_status, points_awarded, points_type
    ) VALUES (
      NEW.id, NEW.user_id, auth.uid(), OLD.status, NEW.status,
      COALESCE(points_to_award, 0), awarded_type
    );
  END IF;

  RETURN NEW;
END;
$function$;