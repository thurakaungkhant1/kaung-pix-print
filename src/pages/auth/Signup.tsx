import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Phone, Lock, Gift, Mail, Eye, EyeOff, Camera, Info, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) setReferralCode(refCode.toUpperCase());
  }, [searchParams]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 2MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      return publicUrl;
    } catch (error: any) {
      toast({ title: "Avatar upload failed", description: error.message || "Failed to upload profile photo", variant: "destructive" });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 capital letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least 1 symbol";
    return null;
  };
  const getPasswordStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s++;
    return s;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address", variant: "destructive" });
      setLoading(false);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({ title: "Invalid Password", description: passwordError, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match", variant: "destructive" });
      setLoading(false);
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      toast({ title: "Invalid name", description: "Name must be between 1 and 100 characters", variant: "destructive" });
      setLoading(false);
      return;
    }
    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && (trimmedPhone.length > 20 || !/^[+\d\s()-]{3,20}$/.test(trimmedPhone))) {
      toast({ title: "Invalid phone number", description: "Please enter a valid phone number (max 20 chars)", variant: "destructive" });
      setLoading(false);
      return;
    }
    const trimmedRef = (referralCode || "").trim();
    if (trimmedRef && (trimmedRef.length > 16 || !/^[A-Za-z0-9]+$/.test(trimmedRef))) {
      toast({ title: "Invalid referral code", description: "Referral code must be alphanumeric", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
          data: { name: trimmedName, phone_number: trimmedPhone, referral_code: trimmedRef || null },
        },
      });
      if (error) throw error;

      if (data.user && avatarFile) {
        const avatarUrl = await uploadAvatar(data.user.id);
        if (avatarUrl) {
          await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", data.user.id);
        }
      }

      toast({ title: "Welcome aboard! 🎉", description: "Your account has been created successfully" });
      const redirectTo = searchParams.get("redirectTo");
      navigate(redirectTo || "/");
    } catch (error: any) {
      let errorMessage = error.message || "Failed to create account";
      if (error.message?.includes("already registered")) {
        errorMessage = "An account with this email already exists. Please login instead.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <MobileLayout className="min-h-screen flex flex-col bg-background">
      {/* Hero header */}
      <div className="relative h-56 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.6),transparent_70%),linear-gradient(135deg,hsl(var(--primary)/0.35),hsl(var(--accent)/0.45))]" />
        <div className="absolute inset-0 bg-[url('/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-md">
            sign up
          </span>
        </div>

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
          <h2 className="text-3xl font-display font-bold text-foreground">Create Account</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Join us and start earning game rewards today
          </p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="h-20 w-20 border-2 border-border group-hover:border-primary transition-all shadow-md">
                  <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                  <AvatarFallback className="bg-muted">
                    <Camera className="h-7 w-7 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </div>
              <p className="text-xs text-muted-foreground">Profile photo (optional)</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" type="text" placeholder="enter your name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 pl-10" />
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
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="09123456789" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required className="h-12 pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1.5 pt-1 animate-fade-in">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((l) => (
                      <div
                        key={l}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all",
                          passwordStrength >= l
                            ? l <= 2 ? "bg-destructive" : l === 3 ? "bg-yellow-500" : "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={cn("flex items-center gap-1", password.length >= 8 ? "text-primary" : "text-muted-foreground")}>
                      <CheckCircle className="h-3 w-3" /> 8+ characters
                    </span>
                    <span className={cn("flex items-center gap-1", /[A-Z]/.test(password) ? "text-primary" : "text-muted-foreground")}>
                      <CheckCircle className="h-3 w-3" /> 1 capital
                    </span>
                    <span className={cn("flex items-center gap-1", /[0-9]/.test(password) ? "text-primary" : "text-muted-foreground")}>
                      <CheckCircle className="h-3 w-3" /> 1 number
                    </span>
                    <span className={cn("flex items-center gap-1", /[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-primary" : "text-muted-foreground")}>
                      <CheckCircle className="h-3 w-3" /> 1 symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-12 pl-10 pr-11" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referralCode" className="text-sm font-semibold">Referral Code (Optional)</Label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                <Input id="referralCode" type="text" placeholder="enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="h-12 pl-10 border-dashed" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="w-full h-12 rounded-full text-base font-semibold mt-2"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{uploadingAvatar ? "Uploading..." : "Creating..."}</>
              ) : (
                "Sign Up"
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
              onClick={() => navigate("/auth/login")}
              className="w-full h-12 rounded-full text-base font-semibold border-2"
            >
              Sign In Instead
            </Button>

            <div className="flex items-start gap-2 pt-4 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>New users get 5 game points instantly on signup via referral.</p>
            </div>

            <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
              created by Thura Kaung Khant
            </p>
          </form>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default Signup;
