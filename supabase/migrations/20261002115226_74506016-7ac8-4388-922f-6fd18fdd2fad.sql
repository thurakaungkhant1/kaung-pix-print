CREATE OR REPLACE FUNCTION public.set_order_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat text;
  is_kgameshop boolean;
BEGIN
  IF NEW.order_type IS NOT NULL AND NEW.order_type <> '' THEN
    RETURN NEW;
  END IF;

  SELECT p.category, COALESCE(p.kgameshop_enabled, false)
  INTO cat, is_kgameshop
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF is_kgameshop THEN
    NEW.order_type := 'game';
  ELSIF cat IN ('Phone Top-up','Data Plans','Voice Plans') THEN
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