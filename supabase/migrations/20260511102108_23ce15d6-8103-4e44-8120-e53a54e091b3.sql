CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_points integer;
  product_category text;
  points_to_award integer;
  is_game_or_mobile boolean;
BEGIN
  IF (NEW.status = 'approved' OR NEW.status = 'finished')
     AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'finished')) THEN

    SELECT points_value, category INTO product_points, product_category
    FROM public.products
    WHERE id = NEW.product_id;

    points_to_award := COALESCE(product_points, 0) * NEW.quantity;

    IF points_to_award > 0 THEN
      is_game_or_mobile := product_category IN (
        'MLBB Diamonds', 'PUBG UC', 'Free Fire', 'Genshin', 'Gift Cards',
        'Phone Top-up', 'Data Plans'
      );

      IF is_game_or_mobile THEN
        UPDATE public.profiles
        SET game_points = game_points + points_to_award
        WHERE id = NEW.user_id;

        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (
          NEW.user_id,
          points_to_award,
          'game_purchase',
          'Earned ' || points_to_award || ' game points from approved ' || COALESCE(product_category, 'order')
        );
      ELSE
        UPDATE public.profiles
        SET points = points + points_to_award
        WHERE id = NEW.user_id;

        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (
          NEW.user_id,
          points_to_award,
          'purchase',
          'Earned ' || points_to_award || ' coins from approved order'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;