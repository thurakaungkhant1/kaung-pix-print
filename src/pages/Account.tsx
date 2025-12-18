import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Moon, Sun, FileText, Mail, LogOut, Shield, Eye, EyeOff, Lock, Coins, Gift, Trophy, ChevronDown, ChevronUp, History, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import SpinnerWheel from "@/components/SpinnerWheel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReferralSection from "@/components/ReferralSection";
import ChatSettings from "@/components/ChatSettings";
import { cn } from "@/lib/utils";

interface Profile {
  name: string;
  phone_number: string;
  points: number;
}

interface WithdrawalSettings {
  minimum_points: number;
  exchange_rate: number;
  terms_conditions: string | null;
  enabled: boolean;
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings | null>(null);
  const [profileSectionOpen, setProfileSectionOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfile();
      checkAdmin();
      loadWithdrawalSettings();
    }
  }, [user]);

  const loadWithdrawalSettings = async () => {
    const { data } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .eq("enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setWithdrawalSettings(data);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("name, phone_number, points")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const checkAdmin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must match",
        variant: "destructive",
      });
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast({
        title: "Invalid password",
        description: "Password must have at least 8 characters, 1 capital letter, 1 number, and 1 symbol",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsChangingPassword(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        
        <div className="relative z-10 p-4 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-primary-foreground tracking-tight">
              Account
            </h1>
            <button
              onClick={toggleTheme}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-primary-foreground/10 border border-primary-foreground/20",
                "transition-all duration-300 hover:bg-primary-foreground/15",
                "active:scale-95"
              )}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-primary-foreground" />
              )}
              <Switch
                id="header-theme-switch"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary-foreground/30"
              />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Points Card - Premium Design */}
        <Card className={cn(
          "relative overflow-hidden border-0",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          "animate-slide-up"
        )}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
          
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-xl bg-primary/15">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              Your Points
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-5">
            <div className="text-center py-4">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-soft" />
                <p className="relative text-5xl font-display font-bold text-primary">
                  {profile?.points?.toLocaleString() || 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Total Points</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-xl border-border/50",
                  "hover:bg-primary/5 hover:border-primary/30",
                  "transition-all duration-300 active:scale-98"
                )}
                onClick={() => setSpinnerOpen(true)}
              >
                <Gift className="mr-2 h-5 w-5 text-accent" />
                <span>Daily Spin</span>
                <Sparkles className="ml-1 h-3 w-3 text-accent/70" />
              </Button>
              <Button
                className={cn(
                  "h-12 rounded-xl bg-primary hover:bg-primary/90",
                  "shadow-glow transition-all duration-300",
                  "hover:shadow-lg active:scale-98"
                )}
                onClick={() => navigate("/exchange")}
              >
                <Coins className="mr-2 h-5 w-5" />
                Exchange
              </Button>
            </div>
            
            {withdrawalSettings && profile && profile.points < withdrawalSettings.minimum_points && (
              <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
                Minimum {withdrawalSettings.minimum_points.toLocaleString()} points required to exchange
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Earners Card */}
        <Card 
          className={cn(
            "premium-card cursor-pointer group animate-slide-up",
            "hover:border-primary/30"
          )}
          style={{ animationDelay: "50ms" }}
          onClick={() => navigate("/top-earners")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 group-hover:bg-accent/20 transition-colors">
                <Trophy className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Top Earners</h3>
                <p className="text-sm text-muted-foreground">See the leaderboard</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>

        {/* History Links */}
        <Card className="premium-card animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-xl bg-muted">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: "Point History", path: "/point-history" },
              { label: "Order History", path: "/point-history" },
              { label: "Redeem/Withdrawal History", path: "/point-history" },
            ].map((item, index) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl",
                  "hover:bg-muted/50 transition-all duration-200",
                  "active:scale-99 group"
                )}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Referral Section */}
        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <ReferralSection />
        </div>

        {/* Chat Settings */}
        <div className="animate-slide-up" style={{ animationDelay: "175ms" }}>
          <ChatSettings />
        </div>

        {/* Profile Information */}
        <Card className="premium-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Collapsible open={profileSectionOpen} onOpenChange={setProfileSectionOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-2xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    Profile Information
                  </div>
                  <div className={cn(
                    "p-1.5 rounded-lg bg-muted transition-transform duration-200",
                    profileSectionOpen && "rotate-180"
                  )}>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* Profile Details */}
                <div className="space-y-4 bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{profile?.name || "Loading..."}</p>
                    </div>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p className="font-medium">{profile?.phone_number || "Loading..."}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Password Management Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Change Password
                  </h3>

                  <div className="space-y-3">
                    {[
                      { id: "current-password", label: "Current Password", value: currentPassword, setValue: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                      { id: "new-password", label: "New Password", value: newPassword, setValue: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                      { id: "confirm-password", label: "Confirm New Password", value: confirmPassword, setValue: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword },
                    ].map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label htmlFor={field.id} className="text-sm">{field.label}</Label>
                        <div className="relative">
                          <Input
                            id={field.id}
                            type={field.show ? "text" : "password"}
                            value={field.value}
                            onChange={(e) => field.setValue(e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            className="pr-10 h-11 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => field.setShow(!field.show)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-xs text-muted-foreground">
                      Must have 8+ characters, 1 capital letter, 1 number, 1 symbol
                    </p>
                    
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                      className="w-full h-11 rounded-xl"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "250ms" }}>
          {[
            { icon: Mail, label: "AI Assistant", path: "/ai-chat", show: true },
            { icon: Shield, label: "Admin Dashboard", path: "/admin", show: isAdmin },
            { icon: FileText, label: "Terms & Policy", path: "/terms", show: true },
            { icon: Mail, label: "Contact Us", path: "/contact", show: true },
          ].filter(item => item.show).map((item) => (
            <Button
              key={item.label}
              variant="outline"
              className={cn(
                "w-full justify-start h-12 rounded-xl border-border/50",
                "hover:bg-muted/50 hover:border-primary/20",
                "transition-all duration-200 active:scale-99"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="mr-3 h-5 w-5 text-muted-foreground" />
              {item.label}
            </Button>
          ))}

          <Button
            variant="outline"
            className={cn(
              "w-full justify-start h-12 rounded-xl mt-4",
              "border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50",
              "transition-all duration-200 active:scale-99"
            )}
            onClick={signOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>

      <SpinnerWheel
        open={spinnerOpen}
        onOpenChange={setSpinnerOpen}
        onPointsWon={() => {
          loadProfile();
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Account;