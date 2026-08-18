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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsLoading(false);
        if (redirectOnFail) navigate(redirectTo);
        return;
      }
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "mobile_admin"] as any);

        if (data && data.length > 0) {
          setAllowed(true);
        } else {
          setAllowed(false);
          if (redirectOnFail) navigate(redirectTo);
        }
      } catch (e) {
        setAllowed(false);
        if (redirectOnFail) navigate(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, [user, authLoading, navigate, redirectTo, redirectOnFail]);

  return { allowed, isLoading, user };
};
