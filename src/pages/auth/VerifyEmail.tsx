import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VerifyEmail = () => {
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get current user email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        
        // Check if already verified
        if (user.email_confirmed_at) {
          setIsVerified(true);
        }
      } else {
        // No user, redirect to signup
        navigate("/auth/signup");
      }
    };
    getUser();

    // Listen for auth changes (email verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user?.email_confirmed_at) {
        setIsVerified(true);
        toast({
          title: "Email verified! 🎉",
          description: "Your account is now fully activated",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = useCallback(async () => {
    if (!email || resendCooldown > 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) throw error;

      setResendCooldown(60);
      toast({
        title: "Email sent! 📧",
        description: "Check your inbox for the verification link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [email, resendCooldown, toast]);

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
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
                <CheckCircle className="h-12 w-12 text-primary animate-scale-in" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-display font-bold text-primary">
                Email Verified!
              </CardTitle>
              <CardDescription className="text-base">
                Your account is now fully activated and ready to use
              </CardDescription>
            </div>
          </CardHeader>

          <CardFooter>
            <Button
              className="w-full h-12 text-base group"
              onClick={() => navigate("/")}
            >
              Continue to App
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
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
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-soft" />
              <div className="relative p-4 rounded-full bg-primary/10">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-display font-bold">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to
            </CardDescription>
            {email && (
              <p className="font-medium text-foreground">{email}</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-muted/50 space-y-2">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account. The link will expire in 24 hours.
            </p>
            <p className="text-xs text-muted-foreground">
              Don't see the email? Check your spam folder.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleResendEmail}
            disabled={loading || resendCooldown > 0}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="hover:text-primary transition-colors"
            >
              Back to Login
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth/signup");
              }}
              className="hover:text-primary transition-colors"
            >
              Use Different Email
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;
