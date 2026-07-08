
CREATE OR REPLACE FUNCTION public.search_public_profiles(q text, sort_by text DEFAULT 'recent', limit_count int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  needle text := NULLIF(trim(q), '');
  digits text := regexp_replace(COALESCE(q,''), '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    CASE
      WHEN p.last_seen_privacy = 'public' THEN p.last_seen_at
      WHEN auth.uid() = p.id THEN p.last_seen_at
      WHEN auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.friend_requests fr
        WHERE fr.status = 'accepted'
          AND ((fr.sender_id = auth.uid() AND fr.receiver_id = p.id)
            OR (fr.receiver_id = auth.uid() AND fr.sender_id = p.id))
      ) THEN p.last_seen_at
      ELSE NULL
    END AS last_seen_at,
    p.created_at
  FROM public.profiles p
  WHERE p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(p.is_active_visible, true) = true
    AND (
      needle IS NULL
      OR p.name ILIKE '%' || needle || '%'
      OR (length(digits) >= 3 AND regexp_replace(COALESCE(p.phone_number,''), '\D', '', 'g') ILIKE '%' || digits || '%')
    )
  ORDER BY
    CASE WHEN sort_by = 'name' THEN lower(p.name) END ASC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN sort_by = 'recent' OR sort_by IS NULL THEN p.last_seen_at END DESC NULLS LAST,
    p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 50), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, text, int) TO authenticated, anon;
