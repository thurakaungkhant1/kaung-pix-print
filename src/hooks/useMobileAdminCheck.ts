import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Options {
  redirectTo?: string;
  redirectOnFail?: boolean;
}

/**
 * Allows access for both `admin` and `mobile_admin` roles.
 */
export const useMobileAdminCheck = (options: Options = {}) => {
  const { redirectTo = "/", redirectOnFail = true } = options;
  const [allowed, setAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (authLoading) return;
      if (!user || !session) {
        setIsLoading(false);
        if (redirectOnFail) navigate(redirectTo);
        return;
      }
      try {
        const [admin, mobileAdmin] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "mobile_admin" as any }),
        ]);
        if (cancelled) return;

        if (admin.data === true || mobileAdmin.data === true) {
          setAllowed(true);
        } else {
          setAllowed(false);
          if (redirectOnFail) navigate(redirectTo);
        }
      } catch (e) {
        if (cancelled) return;
        setAllowed(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, !!session, authLoading, navigate, redirectTo, redirectOnFail]);

  return { allowed, isLoading, user };
};
