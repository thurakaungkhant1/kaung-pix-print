-- Add points_value to products table
ALTER TABLE public.products
ADD COLUMN points_value integer NOT NULL DEFAULT 0;

-- Add order details columns to orders table
ALTER TABLE public.orders
ADD COLUMN phone_number text NOT NULL DEFAULT '',
ADD COLUMN delivery_address text NOT NULL DEFAULT '',
ADD COLUMN payment_method text NOT NULL DEFAULT 'cod',
ADD COLUMN payment_proof_url text;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);

-- RLS policies for payment-proofs bucket
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Function to award points when order is finished
CREATE OR REPLACE FUNCTION public.award_points_on_order_finish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_points integer;
  points_to_award integer;
BEGIN
  -- Only proceed if status changed to 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    -- Get the product's points_value
    SELECT points_value INTO product_points
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Calculate points to award
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
      'Points awarded for order #' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for awarding points
CREATE TRIGGER award_points_on_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.award_points_on_order_finish();