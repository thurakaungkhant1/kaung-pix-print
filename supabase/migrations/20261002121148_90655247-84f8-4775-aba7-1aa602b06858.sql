CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text; v_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_label := CASE NEW.status
    WHEN 'pending' THEN 'Pending'
    WHEN 'approved' THEN 'Processing'
    WHEN 'finished' THEN 'Completed'
    WHEN 'rejected' THEN 'Failed'
    WHEN 'cancelled' THEN 'Cancelled'
    ELSE NEW.status END;
  SELECT name INTO v_name FROM public.products WHERE id = NEW.product_id;
  INSERT INTO public.notifications (title, message, link_url, action_text, target_type, target_user_id, created_by)
  VALUES ('Order ' || v_label,
    'Order #' || upper(substr(NEW.id::text,1,8)) || ' (' || COALESCE(v_name, NEW.plan_name, 'package') || ') ၏ status သည် ' || v_label || ' ဖြစ်သွားပါပြီ။',
    '/orders/' || NEW.id, 'View order', 'user', NEW.user_id, COALESCE(auth.uid(), NEW.user_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();