DROP POLICY IF EXISTS "Admins can manage ad placements" ON public.ad_placements;
CREATE POLICY "Admins can manage ad placements" ON public.ad_placements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage gift links" ON public.ai_gift_links;
CREATE POLICY "Admins manage gift links" ON public.ai_gift_links
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage background music" ON public.background_music;
CREATE POLICY "Admins can manage background music" ON public.background_music
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.prevent_message_content_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted OR OLD.is_deleted IS TRUE THEN
    NEW.content := OLD.content;
    NEW.media_url := OLD.media_url;
    NEW.media_type := OLD.media_type;
    NEW.transcription := OLD.transcription;
    NEW.reply_to_id := OLD.reply_to_id;
    NEW.conversation_id := OLD.conversation_id;
    NEW.sender_id := OLD.sender_id;
    NEW.created_at := OLD.created_at;
    NEW.edited_at := OLD.edited_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_message_content_tamper ON public.messages;
CREATE TRIGGER prevent_message_content_tamper
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.prevent_message_content_tamper();