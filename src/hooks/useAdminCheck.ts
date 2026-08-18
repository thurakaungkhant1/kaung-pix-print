import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseAdminCheckOptions {
  redirectTo?: string;
  redirectOnFail?: boolean;
}

export const useAdminCheck = (options: UseAdminCheckOptions = {}) => {
  const { redirectTo = "/", redirectOnFail = true } = options;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (authLoading) return;

      if (!user || !session) {
        setIsLoading(false);
        if (redirectOnFail) navigate(redirectTo);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (cancelled) return;

        if (error) throw error;

        if (data === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          if (redirectOnFail) navigate(redirectTo);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to check admin status:", err);
        setIsAdmin(false);
        // Network/temporary failures must not bounce the user around.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [user?.id, !!session, authLoading, navigate, redirectTo, redirectOnFail]);

  return { isAdmin, isLoading, user };
};
