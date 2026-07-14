import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ensureProfileRow } from "@/lib/profileEnsure";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const route = async (userId: string) => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (rolesData ?? []).map((r: any) => r.role);
      const isAdmin = roles.includes("admin");
      const isMobileAdmin = roles.includes("mobile_admin");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      const needsCompletion = !profile?.name;

      let saved: string | null = null;
      try { saved = sessionStorage.getItem("postAuthRedirect"); sessionStorage.removeItem("postAuthRedirect"); } catch {}

      if (needsCompletion) {
        navigate("/auth/complete-profile", { replace: true });
      } else if (saved) {
        navigate(saved, { replace: true });
      } else if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (isMobileAdmin) {
        navigate("/admin/mobile-panel", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        await route(data.session.user.id);
        return;
      }
      // Session may hydrate slightly later after the hash exchange
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) {
          sub.subscription.unsubscribe();
          route(session.user.id);
        }
      });
      // Fallback: if nothing arrives in 5s, send to login
      setTimeout(() => {
        if (!cancelled) navigate("/auth/login", { replace: true });
      }, 5000);
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default AuthCallback;
