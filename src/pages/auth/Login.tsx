import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, Info } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
