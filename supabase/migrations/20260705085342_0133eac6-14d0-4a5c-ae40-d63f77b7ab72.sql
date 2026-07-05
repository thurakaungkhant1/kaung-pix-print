
REVOKE ALL ON FUNCTION realtime.can_access_topic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION realtime.can_access_topic(text) TO authenticated, service_role;
