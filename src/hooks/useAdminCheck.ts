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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsLoading(false);
        if (redirectOnFail) {
          navigate(redirectTo);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          if (redirectOnFail) {
            navigate(redirectTo);
          }
        } else if (!data) {
          setIsAdmin(false);
          if (redirectOnFail) {
            navigate(redirectTo);
          }
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        setIsAdmin(false);
        if (redirectOnFail) {
          navigate(redirectTo);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading, navigate, redirectTo, redirectOnFail]);

  return { isAdmin, isLoading, user };
};
