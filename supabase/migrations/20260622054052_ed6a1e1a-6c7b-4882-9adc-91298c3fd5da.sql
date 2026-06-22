-- Add new enum value
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mobile_admin';

-- Assign role to existing user if present
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'susandiyoon234@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'mobile_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Update handle_new_user to auto-assign mobile_admin for this email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id uuid;
  ref_code text;
  user_name text;
  user_phone text;
  user_avatar text;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';

  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
  END IF;

  user_name := LEFT(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'User'
  )), 100);

  user_phone := LEFT(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, '')), 20);

  user_avatar := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  ), 500);
  IF user_avatar = '' THEN user_avatar := NULL; END IF;

  INSERT INTO public.profiles (id, name, phone_number, email, referral_code, referred_by, avatar_url)
  VALUES (
    NEW.id, user_name, user_phone, NEW.email,
    public.generate_referral_code(), referrer_id, user_avatar
  )
  ON CONFLICT (id) DO NOTHING;

  IF referrer_id IS NOT NULL THEN
    UPDATE public.profiles SET points = points + 10 WHERE id = referrer_id;
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (referrer_id, 10, 'referral', 'Earned 10 points for referring a new user');
    UPDATE public.profiles SET points = points + 5 WHERE id = NEW.id;
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 5, 'referral', 'Welcome bonus: 5 points for joining via referral');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  IF NEW.email = 'susandiyoon234@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'mobile_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
