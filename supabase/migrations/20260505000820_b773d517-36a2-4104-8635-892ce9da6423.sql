-- 1. Restrict payment methods to authenticated
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Authenticated users can view active payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. Profile field length constraints (defensive: truncate first to avoid violating existing rows)
UPDATE public.profiles SET name = LEFT(name, 100) WHERE char_length(name) > 100;
UPDATE public.profiles SET phone_number = LEFT(phone_number, 20) WHERE char_length(phone_number) > 20;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_length CHECK (char_length(name) <= 100);
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_length CHECK (char_length(phone_number) <= 20);

-- 3. Sanitize signup metadata in trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_id uuid;
  ref_code text;
  user_name text;
  user_phone text;
  user_avatar text;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';

  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = ref_code;
  END IF;

  user_name := LEFT(TRIM(COALESCE(NEW.raw_user_meta_data->>'name', 'User')), 100);
  user_phone := LEFT(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone_number', '')), 20);
  user_avatar := LEFT(COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 500);
  IF user_avatar = '' THEN user_avatar := NULL; END IF;

  INSERT INTO public.profiles (id, name, phone_number, email, referral_code, referred_by, avatar_url)
  VALUES (
    NEW.id,
    user_name,
    user_phone,
    NEW.email,
    public.generate_referral_code(),
    referrer_id,
    user_avatar
  );

  IF referrer_id IS NOT NULL THEN
    UPDATE public.profiles SET points = points + 10 WHERE id = referrer_id;
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (referrer_id, 10, 'referral', 'Earned 10 points for referring a new user');

    UPDATE public.profiles SET points = points + 5 WHERE id = NEW.id;
    INSERT INTO public.point_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 5, 'referral', 'Welcome bonus: 5 points for joining via referral');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- 4. Conversations: allow participants to delete
CREATE POLICY "Participants can delete their own conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING ((auth.uid() = participant1_id) OR (auth.uid() = participant2_id));