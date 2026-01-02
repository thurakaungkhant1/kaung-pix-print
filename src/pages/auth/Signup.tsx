import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Phone, Lock, Gift, Sparkles, CheckCircle, Mail, Eye, EyeOff, ShoppingCart, Camera, ArrowRight } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { cn } from "@/lib/utils";

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
  
  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  // Handle avatar file selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive"
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Avatar upload failed",
        description: error.message || "Failed to upload profile photo",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      // First create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
          data: {
            name,
            phone_number: phoneNumber,
            referral_code: referralCode || null
          }
        }
      });

      if (error) throw error;

      // If user was created and we have an avatar file, upload it
      if (data.user && avatarFile) {
        const avatarUrl = await uploadAvatar(data.user.id);
        
        if (avatarUrl) {
          // Update the profile with the avatar URL
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('Failed to update profile with avatar:', updateError);
          } else {
            toast({
              title: "Profile photo uploaded!",
              description: "Your avatar has been saved"
            });
          }
        }
      }

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been created successfully"
      });
      
      // Redirect to original URL if provided, otherwise to home
      const redirectTo = searchParams.get("redirectTo");
      navigate(redirectTo || "/");
    } catch (error: any) {
      let errorMessage = error.message || "Failed to create account";
      if (error.message?.includes("already registered")) {
        errorMessage = "An account with this email already exists. Please login instead.";
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


  const passwordStrength = getPasswordStrength();

  return (
    <MobileLayout className="flex items-center justify-center p-4 relative overflow-hidden min-h-screen">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-primary/20 animate-gradient-shift" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/3 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      {/* Sparkle decorations */}
      <div className="absolute top-16 left-10 text-accent/40">
        <Sparkles className="h-6 w-6 animate-pulse" />
      </div>
      <div className="absolute bottom-24 right-8 text-primary/40">
        <Sparkles className="h-4 w-4 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <Card className={cn(
        "w-full max-w-md relative z-10 my-8",
        "border-border/30 shadow-2xl backdrop-blur-sm bg-card/95",
        "animate-fade-in hover-lift"
      )}>
        {/* Card shine effect */}
        <div className="card-shine" />
        
        <CardHeader className="space-y-3 text-center pb-2">
          {/* Logo with glow */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/40 to-primary/40 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity animate-pulse-soft" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl transition-transform group-hover:scale-105">
                <ShoppingCart className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <CardTitle className="text-3xl font-display font-bold">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Kaung Computer
              </span>
            </CardTitle>
            <CardDescription className="text-base">
              Create your account and start earning points!
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-sm text-muted-foreground">Profile Photo (Optional)</Label>
              <div 
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <Avatar className="h-24 w-24 border-4 border-primary/20 group-hover:border-primary/50 transition-all shadow-lg">
                  <AvatarImage src={avatarPreview || undefined} alt="Avatar preview" />
                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Camera className="h-6 w-6 text-primary" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>
              {avatarFile && (
                <p className="text-xs text-primary font-medium">{avatarFile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Name
              </Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Your name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className="h-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-primary" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="h-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-primary" />
                Phone Number
              </Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="09123456789" 
                value={phoneNumber} 
                onChange={e => setPhoneNumber(e.target.value)} 
                required 
                className="h-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="h-12 pr-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div 
                        key={level} 
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-all duration-300",
                          passwordStrength >= level 
                            ? level <= 2 ? "bg-destructive" : level === 3 ? "bg-yellow-500" : "bg-primary" 
                            : "bg-muted"
                        )} 
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className={cn(
                      "flex items-center gap-1 transition-colors",
                      password.length >= 8 ? "text-primary" : "text-muted-foreground"
                    )}>
                      <CheckCircle className={cn("h-3 w-3", password.length >= 8 ? "opacity-100" : "opacity-30")} />
                      8+ characters
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 transition-colors",
                      /[A-Z]/.test(password) ? "text-primary" : "text-muted-foreground"
                    )}>
                      <CheckCircle className={cn("h-3 w-3", /[A-Z]/.test(password) ? "opacity-100" : "opacity-30")} />
                      1 capital
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 transition-colors",
                      /[0-9]/.test(password) ? "text-primary" : "text-muted-foreground"
                    )}>
                      <CheckCircle className={cn("h-3 w-3", /[0-9]/.test(password) ? "opacity-100" : "opacity-30")} />
                      1 number
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 transition-colors",
                      /[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-primary" : "text-muted-foreground"
                    )}>
                      <CheckCircle className={cn("h-3 w-3", /[!@#$%^&*(),.?":{}|<>]/.test(password) ? "opacity-100" : "opacity-30")} />
                      1 symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  className="h-12 pr-12 border-border/50 focus:border-primary/50 transition-all bg-background/50 backdrop-blur-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive animate-fade-in">Passwords don't match</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4 text-accent" />
                Referral Code (Optional)
              </Label>
              <Input 
                id="referralCode" 
                type="text" 
                placeholder="Enter referral code" 
                value={referralCode} 
                onChange={e => setReferralCode(e.target.value.toUpperCase())} 
                className="h-12 border-dashed border-accent/50 focus:border-accent transition-all bg-background/50 backdrop-blur-sm" 
              />
              <p className="text-xs text-accent flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Have a referral code? Get 5 bonus points!
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold group btn-press bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all" 
              disabled={loading || uploadingAvatar}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {uploadingAvatar ? "Uploading photo..." : "Creating account..."}
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <button 
                type="button" 
                onClick={() => navigate("/auth/login")} 
                className="text-primary font-semibold hover:text-primary/80 hover:underline underline-offset-4 transition-all"
              >
                Login
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </MobileLayout>
  );
};

export default Signup;