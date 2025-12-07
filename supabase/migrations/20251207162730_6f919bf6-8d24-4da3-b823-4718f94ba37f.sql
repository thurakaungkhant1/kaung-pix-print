-- Update handle_new_user function to properly handle email-based signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  referrer_id uuid;
  ref_code text;
BEGIN
  -- Get referral code from metadata if provided
  ref_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- Find referrer if code was provided
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = ref_code;
  END IF;
  
  -- Insert profile with referral info (use email directly now)
  INSERT INTO public.profiles (id, name, phone_number, email, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    NEW.email,
    public.generate_referral_code(),
    referrer_id
  );
  
  -- Award points to both users if valid referral
  IF referrer_id IS NOT NULL THEN
    -- Award 10 points to referrer
    UPDATE public.profiles
    SET points = points + 10
    WHERE id = referrer_id;
    
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (referrer_id, 10, 'referral', 'Earned 10 points for referring a new user');
    
    -- Award 5 points to new user
    UPDATE public.profiles
    SET points = points + 5
    WHERE id = NEW.id;
    
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 5, 'referral', 'Welcome bonus: 5 points for joining via referral');
  END IF;
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;