
-- Audit log table for order status changes
CREATE TABLE IF NOT EXISTS public.order_approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  changed_by uuid,
  previous_status text,
  new_status text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  points_type text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_approval_audit TO authenticated;
GRANT ALL ON public.order_approval_audit TO service_role;

ALTER TABLE public.order_approval_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order audit"
ON public.order_approval_audit FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_order_approval_audit_order ON public.order_approval_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_order_approval_audit_user ON public.order_approval_audit(user_id, created_at DESC);

-- Update award-points trigger to also write audit + notification
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

      -- Notify the buyer
      INSERT INTO public.notifications (title, message, target_type, target_user_id)
      VALUES (
        'Coins ရရှိပါပြီ',
        'လူကြီးမင်း၏ ၀ယ်ယူမှုကြောင့် coin ' || points_to_award || ' ခု ရရှိသွားပါပြီ။',
        'user',
        NEW.user_id
      );
    END IF;
  END IF;

  -- Audit any status change
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

-- Enable realtime for notifications so the client can toast instantly
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
