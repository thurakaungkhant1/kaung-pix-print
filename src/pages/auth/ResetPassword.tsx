import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user came from a valid reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();

    // Listen for auth state changes (when user clicks reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password updated! 🎉",
        description: "Your password has been reset successfully",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/auth/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  // Loading state
  if (isValidSession === null) {
    return (
      <MobileLayout className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </MobileLayout>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <MobileLayout className="flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
        
        <Card className={cn(
          "w-full max-w-md relative z-10",
          "border-border/50 shadow-xl",
          "animate-slide-up"
        )}>
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="flex justify-center">
              <div className="relative p-4 rounded-full bg-destructive/10">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-display font-bold">
                Invalid or Expired Link
              </CardTitle>
              <CardDescription className="text-base">
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </div>
          </CardHeader>

          <CardFooter className="flex flex-col space-y-3">
            <Button
              className="w-full"
              onClick={() => navigate("/auth/forgot-password")}
            >
              Request New Link
            </Button>
            <button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Back to Login
            </button>
          </CardFooter>
        </Card>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <Card className={cn(
        "w-full max-w-md relative z-10",
        "border-border/50 shadow-xl",
        "animate-slide-up"
      )}>
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <div className="relative p-4 rounded-full bg-primary/10">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-display font-bold">
              Set New Password
            </CardTitle>
            <CardDescription className="text-base">
              Choose a strong password for your account
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleReset}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
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
              <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || password !== confirmPassword}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </MobileLayout>
  );
};

export default ResetPassword;
