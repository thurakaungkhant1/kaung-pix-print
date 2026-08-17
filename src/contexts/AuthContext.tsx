import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { checkProfilesAccess, ensureProfileRow } from "@/lib/profileEnsure";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * A corrupt/expired session left in localStorage makes supabase-js retry
 * /auth/v1/token?grant_type=refresh_token forever ("Failed to fetch" loop)
 * and blocks new sign-ins. Drop obviously invalid entries at startup.
 */
function purgeCorruptSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!/^sb-.*-auth-token$/.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.removeItem(key);
        continue;
      }
      const rt = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token;
      const at = parsed?.access_token ?? parsed?.currentSession?.access_token;
      if (typeof rt !== "string" || rt.length < 20 || typeof at !== "string" || at.split(".").length !== 3) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage access issues
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    purgeCorruptSession();

    // Startup check: warn if the profiles table is unreachable via the Data API.
    checkProfilesAccess();


    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Defer to avoid blocking the auth callback tick
          setTimeout(() => { ensureProfileRow(session.user); }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
