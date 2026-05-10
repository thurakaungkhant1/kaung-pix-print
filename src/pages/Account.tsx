import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Phone, Moon, Sun, FileText, Mail, LogOut, Shield, Eye, EyeOff, 
  Lock, Coins, Gift, Trophy, ChevronRight, Sparkles, Camera, Loader2, 
  Trash2, Crown, Settings, History, AlertTriangle, Info, ShieldCheck,
  Check, X, Pencil, CreditCard, Zap, Heart
} from "lucide-react";
import AccountQualityBadge from "@/components/AccountQualityBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

import ReferralSection from "@/components/ReferralSection";
import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ImageCropper";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import PremiumFeaturesDialog from "@/components/PremiumFeaturesDialog";
import PremiumBadge from "@/components/PremiumBadge";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  name: string;
  phone_number: string;
  points: number;
  avatar_url: string | null;
  account_status: string;
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
  
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings | null>(null);
  const [favCounts, setFavCounts] = useState({ games: 0, mobile: 0, photos: 0 });
  
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  
  const { isEnabled: isPushEnabled, requestPermission, setEnabled: setPushEnabled } = usePushNotifications();
  const [pushNotifications, setPushNotificationsState] = useState(false);
  
  useEffect(() => {
    setPushNotificationsState(isPushEnabled());
  }, [isPushEnabled]);
  
  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      if (granted) {
        setPushNotificationsState(true);
        toast({ title: "Push notifications enabled" });
      } else {
        toast({ title: "Permission denied", description: "Please enable notifications in your browser settings", variant: "destructive" });
      }
    } else {
      setPushEnabled(false);
      setPushNotificationsState(false);
      toast({ title: "Push notifications disabled" });
    }
  };
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isPremium, getDaysRemaining } = usePremiumMembership();
  const { language, setLanguage } = useLanguage();
  
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) { loadProfile(); checkAdmin(); loadWithdrawalSettings(); loadFavCounts(); }
  }, [user]);

  const loadFavCounts = async () => {
    if (!user) return;
    const GAME_CATS = ["MLBB Diamonds", "PUBG UC"];
    const MOBILE_CATS = ["Phone Top-up", "Data Plans"];
    const [{ data: prods }, { count: photoCount }] = await Promise.all([
      supabase.from("favourite_products").select("products(category)").eq("user_id", user.id),
      supabase.from("favourite_photos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    let games = 0, mobile = 0;
    (prods as any[] | null)?.forEach((row) => {
      const cat = row?.products?.category;
      if (GAME_CATS.includes(cat)) games++;
      else if (MOBILE_CATS.includes(cat)) mobile++;
    });
    setFavCounts({ games, mobile, photos: photoCount || 0 });
  };

  const loadWithdrawalSettings = async () => {
    const { data } = await supabase.from("withdrawal_settings").select("*").eq("enabled", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) setWithdrawalSettings(data);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("name, phone_number, points, avatar_url, account_status").eq("id", user.id).single();
    if (data) { setProfile(data); setEditName(data.name); setEditPhone(data.phone_number); }
  };

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    if (!isPremium) { toast({ title: "Premium Required", description: "Only premium members can change their name", variant: "destructive" }); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ name: editName.trim() }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Name updated successfully" }); setEditingName(false); loadProfile();
    } catch (error: any) { toast({ title: "Failed to update name", description: error.message, variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const handleSavePhone = async () => {
    if (!user || !editPhone.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ phone_number: editPhone.trim() }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Phone number updated successfully" }); setEditingPhone(false); loadProfile();
    } catch (error: any) { toast({ title: "Failed to update phone", description: error.message, variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setImageToCrop(reader.result as string); setCropperOpen(true); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(croppedBlob)); setImageToCrop(null);
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      toast({ title: "Profile photo updated!", description: "Your avatar has been saved successfully" });
      setAvatarFile(null); setAvatarPreview(null); loadProfile();
    } catch (error: any) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); }
    finally { setUploadingAvatar(false); }
  };

  const deleteAvatar = async () => {
    if (!user) return;
    setDeletingAvatar(true);
    try {
      const { data: files } = await supabase.storage.from('avatars').list(user.id);
      if (files && files.length > 0) { const filePaths = files.map(file => `${user.id}/${file.name}`); await supabase.storage.from('avatars').remove(filePaths); }
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (updateError) throw updateError;
      toast({ title: "Photo removed" }); setAvatarFile(null); setAvatarPreview(null); loadProfile();
    } catch (error: any) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
    finally { setDeletingAvatar(false); setDeleteDialogOpen(false); }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) { toast({ title: "Missing fields", description: "Please fill in all password fields", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPassword)) { toast({ title: "Invalid password", description: "8+ chars, 1 uppercase, 1 number, 1 symbol", variant: "destructive" }); return; }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Success", description: "Password changed successfully" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };

  const SettingItem = ({ icon: Icon, label, description, onClick, rightElement, variant = "default" }: { icon: React.ElementType; label: string; description?: string; onClick?: () => void; rightElement?: React.ReactNode; variant?: "default" | "danger"; }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200",
        "hover:bg-muted/50 active:scale-[0.98]",
        variant === "danger" && "hover:bg-destructive/10"
      )}
    >
      <div className={cn("p-2 rounded-lg", variant === "danger" ? "bg-destructive/10" : "bg-muted")}>
        <Icon className={cn("h-4 w-4", variant === "danger" ? "text-destructive" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 text-left">
        <p className={cn("font-medium text-sm", variant === "danger" && "text-destructive")}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {rightElement || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );

  const EditableField = ({ icon: Icon, label, value, editValue, setEditValue, isEditing, setIsEditing, onSave, disabled = false, disabledMessage }: { icon: React.ElementType; label: string; value: string; editValue: string; setEditValue: (v: string) => void; isEditing: boolean; setIsEditing: (v: boolean) => void; onSave: () => void; disabled?: boolean; disabledMessage?: string; }) => (
    <div className="w-full flex items-center gap-3.5 p-3.5 rounded-xl">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 rounded-lg text-sm" autoFocus />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSave} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-primary" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditing(false); setEditValue(value); }}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <p className="font-medium text-sm">{value || "Not set"}</p>
        )}
      </div>
      {!isEditing && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
          if (disabled) { toast({ title: disabledMessage || "Action not allowed", variant: "destructive" }); return; }
          setIsEditing(true);
        }}>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );

  return (
    <AnimatedPage>
    <MobileLayout className="pb-24">
      {/* ── Hero Profile Header ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary-foreground/5 rounded-full blur-2xl" />
        
        <div className="relative z-10 px-5 pt-10 pb-8">
          {/* Avatar & Info */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-start gap-4"
          >
            <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-primary-foreground/20 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity scale-110" />
              <Avatar className={cn(
                "h-20 w-20 border-3 border-primary-foreground/20 shadow-xl relative",
                "ring-2 ring-primary-foreground/20 transition-all duration-500",
                "group-hover:ring-primary-foreground/40 group-hover:scale-105"
              )}>
                <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                <AvatarFallback className="bg-primary-foreground/10 text-2xl font-bold text-primary-foreground">
                  {profile?.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full",
                "bg-foreground/50 backdrop-blur-sm opacity-0 group-hover:opacity-100",
                "transition-all duration-300"
              )}>
                <Camera className="h-5 w-5 text-primary-foreground" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </div>
            
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-display font-bold text-primary-foreground tracking-tight">
                  {profile?.name || "Loading..."}
                </h1>
                {isPremium && <PremiumBadge isPremium={isPremium} size="sm" />}
              </div>
              <p className="text-xs text-primary-foreground/60 mt-1 flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {user?.email}
              </p>
              
              {avatarFile && (
                <Button 
                  size="sm" onClick={uploadAvatar} disabled={uploadingAvatar}
                  className="mt-2.5 h-8 rounded-full text-xs shadow-lg"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Save Photo
                </Button>
              )}
            </div>
          </motion.div>

        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="p-4">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full h-12 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="profile" className="flex-1 h-full rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <User className="h-3.5 w-3.5 mr-1" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 h-full rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Shield className="h-3.5 w-3.5 mr-1" /> Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex-1 h-full rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Billing
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1 h-full rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Settings className="h-3.5 w-3.5 mr-1" /> More
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4 space-y-3">
            <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/30">
                <EditableField icon={User} label="Name" value={profile?.name || ""} editValue={editName} setEditValue={setEditName} isEditing={editingName} setIsEditing={setEditingName} onSave={handleSaveName} disabled={!isPremium} disabledMessage="Only premium members can change their name" />
                <EditableField icon={Phone} label="Phone Number" value={profile?.phone_number || ""} editValue={editPhone} setEditValue={setEditPhone} isEditing={editingPhone} setIsEditing={setEditingPhone} onSave={handleSavePhone} />
                <SettingItem icon={Mail} label="Email" description={user?.email || "Not set"} onClick={() => {}} rightElement={<></>} />
              </CardContent>
            </Card>

            {profile && <AccountQualityBadge status={profile.account_status || "good"} />}

            {profile?.avatar_url && !avatarFile && (
              <Card className="rounded-2xl border-destructive/20 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <SettingItem icon={Trash2} label="Remove Profile Photo" variant="danger" onClick={() => setDeleteDialogOpen(true)} rightElement={deletingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-4 space-y-3">
            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm">Change Password</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    { id: "current-password", label: "Current Password", value: currentPassword, setValue: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                    { id: "new-password", label: "New Password", value: newPassword, setValue: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                    { id: "confirm-password", label: "Confirm Password", value: confirmPassword, setValue: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1">
                      <Label htmlFor={field.id} className="text-xs">{field.label}</Label>
                      <div className="relative">
                        <Input id={field.id} type={field.show ? "text" : "password"} value={field.value} onChange={(e) => field.setValue(e.target.value)} placeholder={`Enter ${field.label.toLowerCase()}`} className="pr-10 h-10 rounded-lg text-sm" />
                        <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {field.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">8+ chars, 1 uppercase, 1 number, 1 symbol</p>
                  <Button onClick={handlePasswordChange} disabled={isChangingPassword} className="w-full h-10 rounded-lg text-sm">
                    {isChangingPassword ? "Changing..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-destructive/20 shadow-sm">
              <CardContent className="p-1">
                <div className="px-3.5 py-2">
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Danger Zone</p>
                </div>
                <SettingItem icon={AlertTriangle} label="Delete Account" description="Permanently delete your account" variant="danger" onClick={() => setDeleteAccountDialogOpen(true)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-4 space-y-3">
            <Card 
              className={cn("rounded-2xl shadow-sm cursor-pointer border-border/40", isPremium && "bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20")}
              onClick={() => setPremiumDialogOpen(true)}
            >
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", isPremium ? "bg-amber-500/15" : "bg-muted")}>
                    <Crown className={cn("h-4 w-4", isPremium ? "text-amber-500" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Premium</h3>
                      {isPremium && <PremiumBadge isPremium={isPremium} size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isPremium ? `${getDaysRemaining()} days remaining` : "Unlock exclusive benefits"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-4 space-y-3">
            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">{theme === "dark" ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                  <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                </div>
              </CardContent>
            </Card>

            <ReferralSection />

            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-1">
                <SettingItem icon={Sparkles} label="AI Assistant" onClick={() => navigate("/ai-chat")} />
                <Separator className="my-0.5" />
                {isAdmin && (
                  <>
                    <SettingItem icon={Shield} label="Admin Dashboard" onClick={() => navigate("/admin")} />
                    <Separator className="my-0.5" />
                  </>
                )}
                <SettingItem
                  icon={Heart}
                  label="My Favourites"
                  description="Saved games, mobile & photos"
                  onClick={() => {
                    const last = localStorage.getItem("favLastTab") || "games";
                    navigate(`/favourite?tab=${last}`);
                  }}
                  rightElement={
                    <div className="flex items-center gap-1">
                      {[
                        { k: "games", v: favCounts.games, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                        { k: "mobile", v: favCounts.mobile, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                        { k: "photos", v: favCounts.photos, cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
                      ].map((b) => (
                        <span
                          key={b.k}
                          className={cn(
                            "min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                            b.cls
                          )}
                          title={`${b.k}: ${b.v}`}
                        >
                          {b.v}
                        </span>
                      ))}
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  }
                />
                <Separator className="my-0.5" />
                <SettingItem icon={Camera} label="Photo Gallery" description="Browse all photos" onClick={() => navigate("/photo")} />
                <Separator className="my-0.5" />
                <SettingItem icon={Info} label="About Us" onClick={() => navigate("/about")} />
                <Separator className="my-0.5" />
                <SettingItem icon={ShieldCheck} label="Privacy Policy" onClick={() => navigate("/privacy")} />
                <Separator className="my-0.5" />
                <SettingItem icon={FileText} label="Terms & Conditions" onClick={() => navigate("/terms")} />
                <Separator className="my-0.5" />
                <SettingItem icon={Mail} label="Contact Us" onClick={() => navigate("/contact")} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-1">
                <SettingItem icon={LogOut} label="Logout" variant="danger" onClick={signOut} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      

      {imageToCrop && (
        <ImageCropper open={cropperOpen} onOpenChange={(open) => { setCropperOpen(open); if (!open) setImageToCrop(null); }} imageSrc={imageToCrop} onCropComplete={handleCropComplete} aspectRatio={1} />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove your profile photo?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAvatar} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove all your data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { toast({ title: "Contact Support", description: "Please contact support to delete your account" }); setDeleteAccountDialogOpen(false); }} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PremiumFeaturesDialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen} />
    </MobileLayout>
    </AnimatedPage>
  );
};

export default Account;
