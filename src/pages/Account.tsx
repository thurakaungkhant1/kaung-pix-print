import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Moon, Sun, FileText, Mail, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";

interface Profile {
  name: string;
  phone_number: string;
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfile();
      checkAdmin();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("name, phone_number")
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-center">Account</h1>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
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
          Terms & Conditions
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

      <BottomNav />
    </div>
  );
};

export default Account;
