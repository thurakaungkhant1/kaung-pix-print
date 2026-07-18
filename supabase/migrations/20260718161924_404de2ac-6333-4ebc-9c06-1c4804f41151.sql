
CREATE OR REPLACE FUNCTION public.notify_telegram_on_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://ojoenxchuzqonpixomkl.supabase.co/functions/v1/notify-order-telegram',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('order_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_telegram_on_order_insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_on_order_insert ON public.orders;
CREATE TRIGGER trg_notify_telegram_on_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_on_order_insert();
