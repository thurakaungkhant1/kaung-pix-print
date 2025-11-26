import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Moon, Sun, FileText, Mail, LogOut, Shield, Eye, EyeOff, Lock, Coins, Gift, Trophy, ChevronDown, ChevronUp, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import SpinnerWheel from "@/components/SpinnerWheel";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReferralSection from "@/components/ReferralSection";

interface Profile {
  name: string;
  phone_number: string;
  points: number;
  download_pin: string | null;
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
  const [downloadPin, setDownloadPin] = useState("");
  const [confirmDownloadPin, setConfirmDownloadPin] = useState("");
  const [showDownloadPin, setShowDownloadPin] = useState(false);
  const [showConfirmDownloadPin, setShowConfirmDownloadPin] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
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
      .select("name, phone_number, points, download_pin")
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

  const handlePinSetup = async () => {
    if (!downloadPin || !confirmDownloadPin) {
      toast({
        title: "Missing fields",
        description: "Please fill in all PIN fields",
        variant: "destructive",
      });
      return;
    }

    if (downloadPin.length !== 6 || !/^\d{6}$/.test(downloadPin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (downloadPin !== confirmDownloadPin) {
      toast({
        title: "PINs don't match",
        description: "PIN and confirm PIN must match",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsSettingPin(true);

    const { error } = await supabase
      .from("profiles")
      .update({ download_pin: downloadPin })
      .eq("id", user.id);

    setIsSettingPin(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to set download PIN",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Download PIN set successfully",
      });
      setDownloadPin("");
      setConfirmDownloadPin("");
      loadProfile();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-center">Account</h1>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Points Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              Your Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{profile?.points?.toLocaleString() || 0}</p>
              <p className="text-sm text-muted-foreground mt-2">Total Points</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSpinnerOpen(true)}
              >
                <Gift className="mr-2 h-4 w-4" />
                Daily Spin
              </Button>
              <Button
                variant="default"
                className="w-full"
                onClick={() => navigate("/exchange")}
              >
                <Coins className="mr-2 h-4 w-4" />
                Exchange
              </Button>
            </div>
            
            {withdrawalSettings && profile && profile.points < withdrawalSettings.minimum_points && (
              <p className="text-xs text-center text-muted-foreground">
                View exchange options! Minimum {withdrawalSettings.minimum_points.toLocaleString()} points required to exchange.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Earners Card */}
        <Card 
          className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/top-earners")}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Top Earners
              </div>
              <span className="text-sm text-muted-foreground">View All →</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              See who's leading the leaderboard
            </p>
          </CardContent>
        </Card>

        {/* History Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-6 w-6" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/point-history")}
            >
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Point History</span>
            </Button>
            <Separator />
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/point-history")}
            >
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Order History</span>
            </Button>
            <Separator />
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/point-history")}
            >
              <History className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Redeem/Withdrawal History</span>
            </Button>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <ReferralSection />

        <Card>
          <Collapsible open={profileSectionOpen} onOpenChange={setProfileSectionOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </div>
                  {profileSectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Profile Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{profile?.name || "Loading..."}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone Number</p>
                      <p className="font-medium">{profile?.phone_number || "Loading..."}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Password Management Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Change Password
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must have 8+ characters, 1 capital letter, 1 number, 1 symbol
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                      className="w-full"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Download PIN Protection Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Download PIN Protection
                    </h3>
                  </div>

                  {profile?.download_pin && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        ✓ Download PIN is set. You'll need to enter it when downloading photos.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="download-pin">
                      {profile?.download_pin ? "Change Download PIN" : "Set Download PIN"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="download-pin"
                        type={showDownloadPin ? "text" : "password"}
                        value={downloadPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setDownloadPin(value);
                        }}
                        placeholder="Enter 6-digit PIN"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDownloadPin(!showDownloadPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showDownloadPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be exactly 6 digits (numbers only)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-download-pin">Confirm Download PIN</Label>
                    <div className="relative">
                      <Input
                        id="confirm-download-pin"
                        type={showConfirmDownloadPin ? "text" : "password"}
                        value={confirmDownloadPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setConfirmDownloadPin(value);
                        }}
                        placeholder="Confirm 6-digit PIN"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmDownloadPin(!showConfirmDownloadPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmDownloadPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handlePinSetup}
                    disabled={isSettingPin}
                    className="w-full"
                  >
                    {isSettingPin ? "Setting..." : profile?.download_pin ? "Change PIN" : "Set PIN"}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <Label htmlFor="theme-switch">Dark Mode</Label>
              </div>
              <Switch
                id="theme-switch"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/admin")}
          >
            <Shield className="mr-2 h-5 w-5" />
            Admin Dashboard
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate("/terms")}
        >
          <FileText className="mr-2 h-5 w-5" />
          Terms & Policy
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate("/contact")}
        >
          <Mail className="mr-2 h-5 w-5" />
          Contact Us
        </Button>

        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
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
