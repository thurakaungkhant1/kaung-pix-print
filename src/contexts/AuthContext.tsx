import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ensureProfileRow } from "@/lib/profileEnsure";
import { clearStoredAuthSession } from "@/lib/authRecovery";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Defer to avoid blocking the auth callback tick
          setTimeout(() => { ensureProfileRow(session.user); }, 0);
        }
        // A token refresh that resolves without a session means the stored
        // refresh token is dead: purge it instead of retrying forever.
        if (event === "TOKEN_REFRESHED" && !session) {
          clearStoredAuthSession();
        }
      }
    );

    // Never leave the app stuck on a loading spinner if the initial session
    // lookup cannot reach the network.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        clearStoredAuthSession();
      })
      .finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out must succeed locally even when the network call fails.
    }
    clearStoredAuthSession();
    setSession(null);
    setUser(null);
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
