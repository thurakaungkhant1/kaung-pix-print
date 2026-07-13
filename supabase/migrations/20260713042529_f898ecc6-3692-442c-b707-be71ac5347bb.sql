
-- 1) Add order_type column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_awarded boolean NOT NULL DEFAULT false;

-- 2) Function that derives order_type from product category
CREATE OR REPLACE FUNCTION public.set_order_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat text;
BEGIN
  IF NEW.order_type IS NOT NULL AND NEW.order_type <> '' THEN
    RETURN NEW;
  END IF;

  SELECT category INTO cat FROM public.products WHERE id = NEW.product_id;

  IF cat IN ('Phone Top-up','Data Plans','Voice Plans') THEN
    NEW.order_type := 'mobile';
  ELSIF cat IN ('MLBB Diamonds','PUBG UC','Free Fire','Genshin','Gift Cards') THEN
    NEW.order_type := 'game';
  ELSIF cat IN ('Digital Products','Software & License Keys','Streaming Accounts','Gift Cards & Vouchers','E-books & Courses') THEN
    NEW.order_type := 'digital';
  ELSE
    NEW.order_type := 'physical';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_type ON public.orders;
CREATE TRIGGER trg_set_order_type
BEFORE INSERT OR UPDATE OF product_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_type();

-- 3) Backfill order_type on existing rows
UPDATE public.orders o
SET order_type = CASE
  WHEN p.category IN ('Phone Top-up','Data Plans','Voice Plans') THEN 'mobile'
  WHEN p.category IN ('MLBB Diamonds','PUBG UC','Free Fire','Genshin','Gift Cards') THEN 'game'
  WHEN p.category IN ('Digital Products','Software & License Keys','Streaming Accounts','Gift Cards & Vouchers','E-books & Courses') THEN 'digital'
  ELSE 'physical'
END
FROM public.products p
WHERE o.product_id = p.id AND (o.order_type IS NULL OR o.order_type = '');

-- 4) Award points based on order_type when status transitions to approved/finished
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      IF NEW.order_type IN ('game','mobile') THEN
        UPDATE public.profiles
          SET game_points = COALESCE(game_points,0) + points_to_award
          WHERE id = NEW.user_id;
        INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.user_id, points_to_award, 'game_purchase',
                'Earned ' || points_to_award || ' game points from ' || NEW.order_type || ' order');
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
$$;

DROP TRIGGER IF EXISTS trg_award_points_on_order_finish ON public.orders;
CREATE TRIGGER trg_award_points_on_order_finish
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_order_finish();
