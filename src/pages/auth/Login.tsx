import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { classifyLoginError, logLoginError, probeAuthServer, type LoginFailure } from "@/lib/loginDiagnostics";

async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error("Sign in did not return a valid session");
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const requestedRedirect = searchParams.get("redirectTo");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailure(null);
    const startedAt = performance.now();
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await signIn(normalizedEmail, password);
      toast({ title: "Welcome back!" });
      window.location.replace(redirectTo ?? "/");
    } catch (caughtError: unknown) {
      const result = classifyLoginError(caughtError);

      // For network-class failures, probe the auth server so we can tell the user
      // whether the server is down or their own connection is blocking the request.
      if (result.title === "Cannot reach the sign-in server") {
        const probe = await probeAuthServer();
        result.detail += ` · probe=${probe.ok ? "reachable" : `unreachable(${probe.error ?? probe.status})`}`;
        if (probe.ok) {
          result.message =
            "The auth server is reachable, but this browser could not complete the request — usually an extension, ad-blocker, VPN or offline cache is blocking it.";
          result.hint = "Try again in a normal (non-preview) browser tab, or disable blocking extensions.";
        }
      }

      logLoginError(
        { email: normalizedEmail, elapsedMs: Math.round(performance.now() - startedAt), online: navigator.onLine },
        caughtError,
        result,
      );
      setFailure(result);
      toast({
        title: result.title,
        description: result.hint ? `${result.message} ${result.hint}` : result.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };





  return (
    <MobileLayout className="min-h-screen flex flex-col bg-background">
      {/* Hero header */}
      <div className="relative h-72 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.65),transparent_70%),linear-gradient(135deg,hsl(var(--primary)/0.4),hsl(var(--accent)/0.5))]" />
        <div className="absolute inset-0 bg-[url('/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative z-[1] h-full flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-24 w-24 rounded-3xl bg-card shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-border/50"
          >
            <img
              src="/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png"
              alt="Kaung Digital Store"
              className="h-20 w-20 object-contain"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-display font-extrabold tracking-wide text-foreground drop-shadow-sm"
          >
            KAUNG DIGITAL STORE
          </motion.h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Digital · Gaming · Mobile
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 px-6 pt-4 pb-10"
      >
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-3xl font-display font-bold">Welcome Back</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Sign in to continue to your rewards & wallet
          </p>

          <div className="mt-6" />



          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button type="button" onClick={() => navigate("/auth/forgot-password")} className="text-sm font-semibold text-primary hover:underline">
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full text-base font-semibold mt-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/auth/signup")}
              className="w-full h-12 rounded-full text-sm font-semibold"
            >
              New here? <span className="text-primary ml-1">Create an account</span>
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
