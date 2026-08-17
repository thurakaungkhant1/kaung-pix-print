import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

const Login = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const requestedRedirect = searchParams.get("redirectTo");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : null;

  const routeAfterAuth = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesData ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isMobileAdmin = roles.includes("mobile_admin");

    if (redirectTo && redirectTo !== "/auth/complete-profile") navigate(redirectTo, { replace: true });
    else if (isAdmin) navigate("/admin", { replace: true });
    else if (isMobileAdmin) navigate("/admin/mobile-panel", { replace: true });
    else navigate("/", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // 1) Try signing in with existing account
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data.user) {
        // Only sync the profile name when the user actually typed one
        if (trimmedName) {
          await supabase.from("profiles").update({ name: trimmedName }).eq("id", data.user.id);
        }
        toast({ title: "Welcome back!" });
        await routeAfterAuth(data.user.id);
        return;
      }


      const invalidCreds = error?.message?.includes("Invalid login credentials");
      if (!invalidCreds) throw error;

      // 2) No account yet → create one instantly and sign in
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: trimmedName },
        },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          throw new Error("Invalid login credentials");
        }
        throw signUpError;
      }

      let userId = signUpData.user?.id ?? null;
      if (!signUpData.session) {
        const { data: retry, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
        if (retryError) throw retryError;
        userId = retry.user.id;
      }

      toast({ title: "Welcome aboard! 🎉", description: "Your account is ready" });
      if (userId) await routeAfterAuth(userId);
      else navigate("/", { replace: true });
    } catch (error: any) {
      let errorMessage = error?.message || "Failed to login";
      if (error?.message?.includes("Invalid login credentials")) {
        errorMessage = "Wrong password for this email. Please try again.";
      } else if (error?.code === "backend_unreachable" || error?.status === 503) {
        errorMessage = "Cannot reach the login service right now. Please check your connection and try again.";
      } else if (error?.status === 429 || error?.code === "over_request_rate_limit") {
        errorMessage = "Too many attempts. Please wait a moment, then try again.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
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
          <h2 className="text-3xl font-display font-bold">Welcome</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Enter your details — we'll sign you in or create your account automatically
          </p>

          <div className="mt-6" />

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 pl-10" />
              </div>
            </div>

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
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
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
