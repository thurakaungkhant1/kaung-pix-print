import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!agreedToTerms) {
      toast({
        title: "Terms & Conditions",
        description: "Please accept the Terms & Conditions to continue",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      toast({ title: "Invalid Email", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      setLoading(false);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "Enter your name", variant: "destructive" });
      setLoading(false);
      return;
    }

    const trimmedRef = referralCode.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: trimmedName,
            referral_code: trimmedRef || null,
          },
        },
      });

      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("User creation failed");

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account is ready",
      });

      navigate("/", { replace: true });
    } catch (error: any) {
      console.log("SIGNUP ERROR:", error);
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout className="min-h-screen flex flex-col bg-background">
      {/* Hero header */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.65),transparent_70%),linear-gradient(135deg,hsl(var(--primary)/0.4),hsl(var(--accent)/0.5))]" />
        <div className="absolute inset-0 bg-[url('/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative z-[1] h-full flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-20 w-20 rounded-3xl bg-card shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-border/50"
          >
            <img
              src="/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png"
              alt="Kaung Digital Store"
              className="h-16 w-16 object-contain"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-display font-extrabold tracking-wide text-foreground drop-shadow-sm"
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
          <h2 className="text-3xl font-display font-bold">Create Account</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Join us and unlock your rewards & wallet
          </p>

          <div className="mt-6" />

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referral" className="text-sm font-semibold">Referral Code <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="referral" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="h-12 pl-10" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full text-base font-semibold mt-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default Signup;
