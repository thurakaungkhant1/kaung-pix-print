import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const redirectTo = searchParams.get("redirectTo") || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        toast({ title: "Email not verified", description: "Please verify your email before logging in", variant: "destructive" });
        navigate("/auth/verify-email");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      toast({ title: "Success", description: "Logged in successfully" });

      if (redirectTo) navigate(redirectTo);
      else if (roleData) navigate("/admin");
      else navigate("/");
    } catch (error: any) {
      let errorMessage = error.message || "Failed to login";
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const logGoogleError = async (err: any) => {
    const message = err?.message || String(err) || "Unknown Google sign-in error";
    const code = err?.code || err?.status || err?.error || null;
    // Console log with full details for the developer console
    console.error("[GoogleLogin] failed", { message, code, error: err });
    // Server-side log (admins can review later)
    try {
      await supabase.from("auth_error_logs").insert({
        provider: "google",
        error_message: String(message).slice(0, 1000),
        error_code: code ? String(code).slice(0, 100) : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
      });
    } catch (logErr) {
      console.warn("[GoogleLogin] failed to record error", logErr);
    }
    return message;
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const message = await logGoogleError(result.error);
        setGoogleError(message);
        toast({ title: "Google sign-in failed", description: message, variant: "destructive" });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      if (redirectTo) navigate(redirectTo);
      else navigate("/");
    } catch (e: any) {
      const message = await logGoogleError(e);
      setGoogleError(message);
      toast({ title: "Google sign-in failed", description: message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };


  return (
    <MobileLayout className="min-h-screen flex flex-col bg-background">
      {/* Hero header */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.6),transparent_70%),linear-gradient(135deg,hsl(var(--primary)/0.35),hsl(var(--accent)/0.45))]" />
        <div className="absolute inset-0 bg-[url('/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        {/* Top-left pill */}
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-md">
            login
          </span>
        </div>

        {/* Centered logo + brand */}
        <div className="relative z-[1] h-full flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-20 w-20 rounded-2xl bg-card shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-border/50"
          >
            <img
              src="/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png"
              alt="Kaung Computer Logo"
              className="h-16 w-16 object-contain"
            />
          </motion.div>
          <h1 className="text-2xl font-display font-extrabold tracking-wide text-foreground drop-shadow-sm">
            KAUNG COMPUTER
          </h1>
        </div>
      </div>

      {/* Form section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 px-6 pt-6 pb-10"
      >
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-3xl font-display font-bold text-foreground">Welcome Back</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Sign in to access your game rewards and wallet
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full text-base font-semibold mt-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground tracking-widest">OR</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-12 rounded-full text-base font-semibold border-2 gap-2"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground tracking-widest">OR</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/auth/signup")}
              className="w-full h-12 rounded-full text-base font-semibold border-2"
            >
              Create New Account
            </Button>

            <p className="text-[11px] text-muted-foreground/60 text-center pt-4">
              created by Thura Kaung Khant
            </p>
          </form>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default Login;
