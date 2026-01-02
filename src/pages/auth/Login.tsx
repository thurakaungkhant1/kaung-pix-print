import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get redirect URL from query params
  const redirectTo = searchParams.get("redirectTo") || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Email not verified",
          description: "Please verify your email before logging in",
          variant: "destructive",
        });
        navigate("/auth/verify-email");
        return;
      }
      
      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      toast({
        title: "Success",
        description: "Logged in successfully"
      });
      
      // Redirect to original URL if provided, otherwise based on role
      if (redirectTo) {
        navigate(redirectTo);
      } else if (roleData) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      let errorMessage = error.message || "Failed to login";
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <MobileLayout className="flex items-center justify-center p-4 relative overflow-hidden min-h-screen">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 animate-gradient-shift" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Sparkle decorations */}
      <div className="absolute top-20 right-10 text-primary/40">
        <Sparkles className="h-6 w-6 animate-pulse" />
      </div>
      <div className="absolute bottom-32 left-8 text-accent/40">
        <Sparkles className="h-4 w-4 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <Card className={cn(
        "w-full max-w-md relative z-10",
        "border-border/30 shadow-2xl backdrop-blur-sm bg-card/95",
        "animate-fade-in hover-lift"
      )}>
        {/* Card shine effect */}
        <div className="card-shine" />
        
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo with glow */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity animate-pulse-soft" />
              <img 
                alt="Kaung Computer Logo" 
                src="/lovable-uploads/49f46eaa-5acf-4856-b96b-2468e0d8edcf.png" 
                className="relative h-24 w-24 object-contain rounded-2xl shadow-xl transition-transform group-hover:scale-105" 
              />
            </div>
          </div>
          
          {/* Brand */}
          <div className="space-y-2">
            <CardTitle className="text-3xl font-display font-bold">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Kaung Computer
              </span>
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Welcome back! Login to continue
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Address
              </Label>
              <div className="relative group">
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="h-12 pl-4 pr-4 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-md opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Password
              </Label>
              <div className="relative group">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="h-12 pl-4 pr-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 to-accent/10 rounded-md opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold group btn-press bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all" 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            
            <button
              type="button"
              onClick={() => navigate("/auth/forgot-password")}
              className="text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all"
            >
              Forgot Password?
            </button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <button 
                type="button" 
                onClick={() => navigate("/auth/signup")} 
                className="text-primary font-semibold hover:text-primary/80 hover:underline underline-offset-4 transition-all"
              >
                Sign up
              </button>
            </p>
            
            <p className="text-xs text-muted-foreground/50 text-center pt-2">
              created by Thura Kaung Khant
            </p>
          </CardFooter>
        </form>
      </Card>
    </MobileLayout>
  );
};

export default Login;