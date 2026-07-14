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
  Check, X, Pencil, CreditCard, Zap, Heart, MessageCircle, ShoppingBag, Headphones
} from "lucide-react";
import AccountQualityBadge from "@/components/AccountQualityBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";


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
  game_points: number;
  avatar_url: string | null;
  account_status: string;
  referral_code: string;
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
  const [isMobileAdmin, setIsMobileAdmin] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings | null>(null);
  const [favCounts, setFavCounts] = useState({ games: 0, mobile: 0, photos: 0 });
  const [referrals, setReferrals] = useState<Array<{ id: string; name: string | null; email: string | null; avatar_url: string | null; joined_at: string }>>([]);
  const [showReferrals, setShowReferrals] = useState(false);

  
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
    if (user) { loadProfile(); checkAdmin(); loadWithdrawalSettings(); loadFavCounts(); loadReferrals(); }
  }, [user]);

  const loadReferrals = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_my_referrals" as any);
    if (!error && Array.isArray(data)) {
      setReferrals(data as any);
    }
  };


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
    const { data } = await supabase.from("profiles").select("name, phone_number, points, game_points, avatar_url, account_status, referral_code").eq("id", user.id).single();
    if (data) {
      setProfile(data as Profile);
      setEditName(data.name);
      setEditPhone(data.phone_number);
    }
  };

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "mobile_admin"] as any);
    const roles = (data ?? []).map((r: any) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsMobileAdmin(roles.includes("mobile_admin"));
  };

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({ title: "Name is required", description: "Please enter your name before saving.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      // Upsert so the save works even if the profile row hasn't been created yet.
      const { error } = await supabase
        .from("profiles")
        .upsert(
          [{ id: user.id, email: user.email ?? "", name: trimmed, phone_number: "" }],
          { onConflict: "id" }
        );
      if (error) throw error;
      toast({ title: "Name updated successfully" }); setEditingName(false); loadProfile();
    } catch (error: any) { toast({ title: "Failed to update name", description: error.message, variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    const trimmed = editPhone.trim();
    if (!trimmed) {
      toast({ title: "Phone number is required", description: "Please enter a phone number before saving.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({ phone_number: trimmed }).eq("id", user.id);
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

  // Colored setting row (Telegram/iOS style)
  const Row = ({
    icon: Icon,
    label,
    right,
    onClick,
    iconBg,
    iconColor,
    danger,
  }: {
    icon: React.ElementType;
    label: string;
    right?: React.ReactNode;
    onClick?: () => void;
    iconBg?: string;
    iconColor?: string;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/60 transition-colors",
        danger && "text-destructive"
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg || "bg-muted")}>
        <Icon className={cn("h-4 w-4", iconColor || "text-muted-foreground")} />
      </div>
      <span className="flex-1 text-left text-[15px] font-medium">{label}</span>
      {right !== undefined ? right : <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
    </button>
  );

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-5 mb-2 px-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
    </div>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <div className="mx-4 rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden divide-y divide-border/40">
      {children}
    </div>
  );



  return (
    <AnimatedPage>
    <MobileLayout className="pb-24 bg-background">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-[22px] font-bold tracking-tight">Profile & Settings</h1>
      </div>

      {/* Profile card */}
      <div className="px-4">
        <div className="relative rounded-2xl bg-foreground text-background px-4 py-4 flex items-center gap-3 shadow-sm">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="h-14 w-14 border-2 border-background/20">
              <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
              <AvatarFallback className="bg-background/10 text-background text-lg font-bold">
                {profile?.name?.charAt(0)?.toUpperCase() || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-1 shadow">
              <Camera className="h-3 w-3 text-foreground" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-[15px] truncate">{profile?.name || "Loading..."}</p>
              {isPremium && <PremiumBadge isPremium={isPremium} size="sm" />}
            </div>
            <p className="text-[12px] text-background/60 truncate">{user?.email}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-background/60 shrink-0" />
        </div>

        {avatarFile && (
          <Button size="sm" onClick={uploadAvatar} disabled={uploadingAvatar} className="mt-2 w-full h-9 rounded-xl">
            {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Save Photo
          </Button>
        )}
      </div>

      {/* Coin balance + Referral code cards */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-400/15 to-orange-500/15 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Coins className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Coins</span>
          </div>
          <p className="mt-1.5 text-2xl font-extrabold">{(profile?.game_points ?? 0).toLocaleString()}</p>
          <button onClick={() => navigate("/point-history")} className="mt-1 text-[11px] text-muted-foreground hover:text-primary">
            View history →
          </button>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Refer Code</span>
          </div>
          <p className="mt-1.5 text-lg font-extrabold font-mono tracking-wider truncate">{profile?.referral_code || "—"}</p>
          <button
            onClick={() => {
              if (!profile?.referral_code) return;
              const link = `${window.location.origin}/auth/signup?ref=${profile.referral_code}`;
              navigator.clipboard.writeText(link);
              toast({ title: "Copied!", description: "Referral link copied" });
            }}
            className="mt-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            Copy link →
          </button>
        </div>
      </div>

      {/* ---- My Referrals ---- */}
      <div className="mx-4 mt-4 rounded-2xl border border-border/60 bg-card overflow-hidden">
        <button
          onClick={() => setShowReferrals((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gift className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">My Referrals</p>
              <p className="text-[11px] text-muted-foreground">
                {referrals.length} {referrals.length === 1 ? "friend" : "friends"} joined using your code
              </p>
            </div>
          </div>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", showReferrals && "rotate-90")} />
        </button>

        {showReferrals && (
          <div className="border-t border-border/60 divide-y divide-border/40">
            {referrals.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No one has used your referral code yet. Share your link to earn 15 coins per friend.
              </div>
            ) : (
              referrals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(r.name ?? r.email ?? "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name || "Unnamed"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.email || "—"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(r.joined_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>





      {/* ---- Account ---- */}
      <SectionLabel>Account</SectionLabel>
      <SectionCard>
        <Row
          icon={User}
          label={editingName ? "Editing name…" : (profile?.name ? `Name • ${profile.name}` : "Name")}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => setEditingName(true)}
        />
        {editingName && (
          <div className="px-4 py-3 flex items-center gap-2 bg-muted/30">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 rounded-lg text-sm" autoFocus />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSaveName} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-primary" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setEditingName(false); setEditName(profile?.name || ""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Row
          icon={Phone}
          label={profile?.phone_number ? `Phone • ${profile.phone_number}` : "Phone Number"}
          iconBg="bg-sky-500/10"
          iconColor="text-sky-600 dark:text-sky-400"
          onClick={() => setEditingPhone(true)}
        />
        {editingPhone && (
          <div className="px-4 py-3 flex items-center gap-2 bg-muted/30">
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9 rounded-lg text-sm" autoFocus />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSavePhone} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-primary" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setEditingPhone(false); setEditPhone(profile?.phone_number || ""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SectionCard>

      {/* ---- Preferences ---- */}
      <SectionLabel>Preferences</SectionLabel>
      <SectionCard>
        <Row
          icon={theme === "dark" ? Moon : Sun}
          label="Appearance"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          onClick={toggleTheme}
          right={<span className="text-[13px] text-primary font-medium">{theme === "dark" ? "Dark" : "Light"}</span>}
        />
        <Row
          icon={Sparkles}
          label="Notifications"
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          right={<Switch checked={pushNotifications} onCheckedChange={handlePushNotificationToggle} />}
        />
      </SectionCard>

      {/* ---- Activity ---- */}
      <SectionLabel>Activity</SectionLabel>
      <SectionCard>
        <Row
          icon={Heart}
          label="My Favourites"
          iconBg="bg-rose-500/10"
          iconColor="text-rose-600 dark:text-rose-400"
          onClick={() => {
            const last = localStorage.getItem("favLastTab") || "games";
            navigate(`/favourite?tab=${last}`);
          }}
        />
        <Row
          icon={ShoppingBag}
          label="My Orders"
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
          onClick={() => navigate("/orders")}
        />
        <Row
          icon={Headphones}
          label="Customer Support"
          iconBg="bg-teal-500/10"
          iconColor="text-teal-600 dark:text-teal-400"
          onClick={() => navigate("/support")}
        />
        {isAdmin && (
          <Row
            icon={Shield}
            label="Admin Dashboard"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600 dark:text-amber-400"
            onClick={() => navigate("/admin")}
          />
        )}
        {!isAdmin && isMobileAdmin && (
          <Row
            icon={Shield}
            label="Mobile Admin Panel"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate("/admin/mobile-panel")}
          />
        )}
      </SectionCard>

      {/* ---- About & Legal ---- */}
      <SectionLabel>About</SectionLabel>
      <SectionCard>
        <Row
          icon={ShieldCheck}
          label="Privacy Policy"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
          onClick={() => navigate("/privacy")}
        />
        <Row
          icon={FileText}
          label="Terms & Conditions"
          iconBg="bg-fuchsia-500/10"
          iconColor="text-fuchsia-600 dark:text-fuchsia-400"
          onClick={() => navigate("/terms")}
        />
        <Row
          icon={Info}
          label="Help Center"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => navigate("/contact")}
        />
      </SectionCard>

      {/* ---- Security ---- */}
      <SectionLabel>Security</SectionLabel>
      <SectionCard>
        <Row
          icon={Lock}
          label="Change Password"
          iconBg="bg-slate-500/10"
          iconColor="text-slate-600 dark:text-slate-400"
          onClick={() => {
            const el = document.getElementById("password-section");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
        <Row
          icon={LogOut}
          label="Logout"
          iconBg="bg-destructive/10"
          iconColor="text-destructive"
          danger
          onClick={signOut}
          right={<></>}
        />
      </SectionCard>


      {/* Password change (collapsed-ish, scrolled to on demand) */}
      <div id="password-section" className="px-4 mt-6">
        <Card className="rounded-2xl border-border/40 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2.5">
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

        {profile?.avatar_url && !avatarFile && (
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="mt-3 w-full text-center text-xs text-destructive/80 hover:text-destructive py-2"
          >
            Remove profile photo
          </button>
        )}

        <button
          onClick={() => setDeleteAccountDialogOpen(true)}
          className="mt-1 w-full text-center text-xs text-destructive/60 hover:text-destructive py-2"
        >
          Delete Account
        </button>
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
