import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Phone, Lock, Gift, Sparkles, CheckCircle, Mail, Eye, EyeOff } from "lucide-react";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 capital letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least 1 symbol";
    return null;
  };

  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
          data: {
            name,
            phone_number: phoneNumber,
            referral_code: referralCode || null,
          },
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Verification email sent! 📧",
          description: "Please check your inbox to verify your email",
        });
        navigate("/auth/verify-email");
      } else {
        toast({
          title: "Welcome aboard! 🎉",
          description: "Your account has been created successfully",
        });
        navigate("/");
      }
    } catch (error: any) {
      let errorMessage = error.message || "Failed to create account";
      if (error.message?.includes("already registered")) {
        errorMessage = "An account with this email already exists. Please login instead.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative shadow-2xl border-primary/10 animate-fade-in">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="mx-auto mb-2 p-3 rounded-2xl bg-gradient-primary shadow-lg">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-display font-bold bg-gradient-primary bg-clip-text text-transparent">
            Kaung Computer
          </CardTitle>
          <CardDescription className="text-base">
            Create your account and start earning points!
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? level <= 2
                              ? "bg-destructive"
                              : level === 3
                              ? "bg-yellow-500"
                              : "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className={`flex items-center gap-1 ${password.length >= 8 ? "text-primary" : "text-muted-foreground"}`}>
                      <CheckCircle className={`h-3 w-3 ${password.length >= 8 ? "opacity-100" : "opacity-30"}`} />
                      8+ characters
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-primary" : "text-muted-foreground"}`}>
                      <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(password) ? "opacity-100" : "opacity-30"}`} />
                      1 capital
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-primary" : "text-muted-foreground"}`}>
                      <CheckCircle className={`h-3 w-3 ${/[0-9]/.test(password) ? "opacity-100" : "opacity-30"}`} />
                      1 number
                    </span>
                    <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-primary" : "text-muted-foreground"}`}>
                      <CheckCircle className={`h-3 w-3 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "opacity-100" : "opacity-30"}`} />
                      1 symbol
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                Referral Code (Optional)
              </Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="h-12 border-dashed"
              />
              <p className="text-xs text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Have a referral code? Get 5 bonus points!
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-primary font-semibold hover:underline"
              >
                Login
              </button>
            </p>
            <p className="text-xs text-muted-foreground/60 text-center mt-4">
              created by Thura Kaung Khant
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Signup;