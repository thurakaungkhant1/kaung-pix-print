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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, Phone, Moon, Sun, FileText, Mail, LogOut, Shield, Eye, EyeOff, 
  Lock, Coins, Gift, Trophy, ChevronRight, Sparkles, Camera, Loader2, 
  Trash2, Crown, Bell, Globe, CreditCard, Settings, History, AlertTriangle,
  Check, X, Pencil
} from "lucide-react";
import AccountQualityBadge from "@/components/AccountQualityBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import SpinnerWheel from "@/components/SpinnerWheel";
import ReferralSection from "@/components/ReferralSection";

import { cn } from "@/lib/utils";
import { ImageCropper } from "@/components/ImageCropper";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import PremiumFeaturesDialog from "@/components/PremiumFeaturesDialog";
import PremiumBadge from "@/components/PremiumBadge";
import MobileLayout from "@/components/MobileLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings | null>(null);
  
  // Inline editing states
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  
  // Push notifications hook
  const { isEnabled: isPushEnabled, requestPermission, setEnabled: setPushEnabled } = usePushNotifications();
  const [pushNotifications, setPushNotificationsState] = useState(false);
  
  // Initialize push notification state from hook
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
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive"
        });
      }
    } else {
      setPushEnabled(false);
      setPushNotificationsState(false);
      toast({ title: "Push notifications disabled" });
    }
  };
  
  // Avatar upload states
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
      .select("name, phone_number, points, avatar_url, account_status")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
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
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    
    // Check if user is premium to allow name change
    if (!isPremium) {
      toast({
        title: "Premium Required",
        description: "Only premium members can change their name",
        variant: "destructive"
      });
      return;
    }
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: editName.trim() })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({ title: "Name updated successfully" });
      setEditingName(false);
      loadProfile();
    } catch (error: any) {
      toast({ title: "Failed to update name", description: error.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user || !editPhone.trim()) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: editPhone.trim() })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({ title: "Phone number updated successfully" });
      setEditingPhone(false);
      loadProfile();
    } catch (error: any) {
      toast({ title: "Failed to update phone", description: error.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
    setImageToCrop(null);
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Profile photo updated!",
        description: "Your avatar has been saved successfully"
      });

      setAvatarFile(null);
      setAvatarPreview(null);
      loadProfile();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile photo",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;
    
    setDeletingAvatar(true);
    try {
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage.from('avatars').remove(filePaths);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Photo removed",
        description: "Your profile photo has been deleted"
      });

      setAvatarFile(null);
      setAvatarPreview(null);
      loadProfile();
    } catch (error: any) {
      console.error('Delete avatar error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to remove profile photo",
        variant: "destructive"
      });
    } finally {
      setDeletingAvatar(false);
      setDeleteDialogOpen(false);
    }
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

  // Setting item component for consistent styling
  const SettingItem = ({ 
    icon: Icon, 
    label, 
    description, 
    onClick, 
    rightElement,
    variant = "default"
  }: { 
    icon: React.ElementType;
    label: string;
    description?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
    variant?: "default" | "danger";
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
        "hover:bg-muted/50 active:scale-[0.98]",
        variant === "danger" && "hover:bg-destructive/10"
      )}
    >
      <div className={cn(
        "p-2.5 rounded-xl",
        variant === "danger" ? "bg-destructive/15" : "bg-muted"
      )}>
        <Icon className={cn(
          "h-5 w-5",
          variant === "danger" ? "text-destructive" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 text-left">
        <p className={cn(
          "font-medium",
          variant === "danger" && "text-destructive"
        )}>{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {rightElement || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </button>
  );

  // Editable field component
  const EditableField = ({
    icon: Icon,
    label,
    value,
    editValue,
    setEditValue,
    isEditing,
    setIsEditing,
    onSave,
    disabled = false,
    disabledMessage
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    editValue: string;
    setEditValue: (v: string) => void;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onSave: () => void;
    disabled?: boolean;
    disabledMessage?: string;
  }) => (
    <div className="w-full flex items-center gap-4 p-4 rounded-2xl">
      <div className="p-2.5 rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-9 rounded-xl"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={onSave}
              disabled={savingProfile}
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-500" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => {
                setIsEditing(false);
                setEditValue(value);
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <p className="font-medium">{value || "Not set"}</p>
        )}
      </div>
      {!isEditing && (
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={() => {
            if (disabled) {
              toast({ title: disabledMessage || "Action not allowed", variant: "destructive" });
              return;
            }
            setIsEditing(true);
          }}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );

  return (
    <MobileLayout className="pb-24">
      {/* Profile Header - Premium & Animated */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/10">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 px-6 pt-10 pb-8">
          {/* Avatar & Info - Enhanced */}
          <div className="flex items-start gap-5">
            <div 
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity scale-105" />
              <Avatar className={cn(
                "h-24 w-24 border-4 border-background shadow-xl relative",
                "ring-2 ring-primary/30 transition-all duration-500",
                "group-hover:ring-primary/60 group-hover:scale-105"
              )}>
                <AvatarImage 
                  src={avatarPreview || profile?.avatar_url || undefined} 
                  alt="Profile"
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-3xl font-bold text-primary">
                  {profile?.name?.charAt(0)?.toUpperCase() || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              
              {/* Edit overlay with animation */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full",
                "bg-background/70 backdrop-blur-md opacity-0 group-hover:opacity-100",
                "transition-all duration-300 scale-90 group-hover:scale-100"
              )}>
                <Camera className="h-7 w-7 text-primary animate-bounce" />
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
                  {profile?.name || "Loading..."}
                </h1>
                {isPremium && <PremiumBadge isPremium={isPremium} size="sm" />}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              
              {avatarFile && (
                <Button 
                  size="sm"
                  onClick={uploadAvatar}
                  disabled={uploadingAvatar}
                  className="mt-3 h-9 rounded-full shadow-lg hover:shadow-xl transition-all btn-press"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Save Photo
                </Button>
              )}
            </div>
          </div>

          {/* Points Display - Enhanced Card */}
          <div className="mt-8 p-5 rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-accent/5 backdrop-blur-sm border border-primary/20 shadow-lg hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                  <Coins className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-3xl font-display font-bold text-foreground tracking-tight">
                    {profile?.points?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Total Points</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all btn-press group"
                  onClick={() => setSpinnerOpen(true)}
                >
                  <Gift className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Spin
                </Button>
                <Button
                  size="sm"
                  className="h-10 px-4 rounded-xl shadow-md hover:shadow-lg transition-all btn-press group"
                  onClick={() => navigate("/exchange")}
                >
                  <Coins className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Exchange
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Settings - Enhanced */}
      <div className="p-5">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full h-14 p-1.5 rounded-2xl bg-muted/60 backdrop-blur-sm shadow-inner">
            <TabsTrigger 
              value="profile" 
              className="flex-1 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 data-[state=active]:scale-[1.02]"
            >
              <User className="h-4 w-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex-1 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 data-[state=active]:scale-[1.02]"
            >
              <Shield className="h-4 w-4 mr-1.5" />
              Security
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="flex-1 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 data-[state=active]:scale-[1.02]"
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Billing
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="flex-1 h-full rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 data-[state=active]:scale-[1.02]"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              More
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-5 space-y-4">
            <Card className="rounded-3xl border-border/40 shadow-lg overflow-hidden hover-lift card-shine">
              <CardContent className="p-0 divide-y divide-border/30">
                <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
                  <EditableField
                    icon={User}
                    label="Name"
                    value={profile?.name || ""}
                    editValue={editName}
                    setEditValue={setEditName}
                    isEditing={editingName}
                    setIsEditing={setEditingName}
                    onSave={handleSaveName}
                    disabled={!isPremium}
                    disabledMessage="Only premium members can change their name"
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                  <EditableField
                    icon={Phone}
                    label="Phone Number"
                    value={profile?.phone_number || ""}
                    editValue={editPhone}
                    setEditValue={setEditPhone}
                    isEditing={editingPhone}
                    setIsEditing={setEditingPhone}
                    onSave={handleSavePhone}
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <SettingItem 
                    icon={Mail}
                    label="Email"
                    description={user?.email || "Not set"}
                    onClick={() => {}}
                    rightElement={<></>}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Quality */}
            {profile && (
              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <AccountQualityBadge status={profile.account_status || "good"} />
              </div>
            )}

            {/* Avatar Management */}
            {profile?.avatar_url && !avatarFile && (
              <Card className="rounded-3xl border-destructive/20 shadow-lg overflow-hidden animate-fade-in hover:border-destructive/40 transition-colors" style={{ animationDelay: '200ms' }}>
                <CardContent className="p-0">
                  <SettingItem 
                    icon={Trash2}
                    label="Remove Profile Photo"
                    variant="danger"
                    onClick={() => setDeleteDialogOpen(true)}
                    rightElement={deletingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-4 space-y-4 animate-fade-in">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">Change Password</h3>
                </div>

                <div className="space-y-3">
                  {[
                    { id: "current-password", label: "Current Password", value: currentPassword, setValue: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                    { id: "new-password", label: "New Password", value: newPassword, setValue: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                    { id: "confirm-password", label: "Confirm Password", value: confirmPassword, setValue: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword },
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
                    8+ chars, 1 uppercase, 1 number, 1 symbol
                  </p>
                  
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                    className="w-full h-11 rounded-xl"
                  >
                    {isChangingPassword ? "Changing..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="rounded-2xl border-destructive/30 shadow-sm">
              <CardContent className="p-2">
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-destructive">DANGER ZONE</p>
                </div>
                <SettingItem 
                  icon={AlertTriangle}
                  label="Delete Account"
                  description="Permanently delete your account and data"
                  variant="danger"
                  onClick={() => setDeleteAccountDialogOpen(true)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-4 space-y-4 animate-fade-in">
            {/* Premium Status */}
            <Card 
              className={cn(
                "rounded-2xl border-amber-500/30 shadow-sm cursor-pointer",
                isPremium && "bg-gradient-to-br from-amber-500/10 to-transparent"
              )}
              onClick={() => setPremiumDialogOpen(true)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    isPremium ? "bg-amber-500/20" : "bg-muted"
                  )}>
                    <Crown className={cn("h-5 w-5", isPremium ? "text-amber-500" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Premium Membership</h3>
                      {isPremium && <PremiumBadge isPremium={isPremium} size="sm" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPremium ? `${getDaysRemaining()} days remaining` : "Unlock exclusive benefits"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            {/* Leaderboard & History */}
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-2">
                <SettingItem 
                  icon={Trophy}
                  label="Top Earners"
                  description="View the leaderboard"
                  onClick={() => navigate("/top-earners")}
                />
                <Separator className="my-1" />
                <SettingItem 
                  icon={History}
                  label="Point History"
                  onClick={() => navigate("/point-history")}
                />
              </CardContent>
            </Card>

            {withdrawalSettings && profile && profile.points < withdrawalSettings.minimum_points && (
              <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-xl py-3 px-4">
                Minimum {withdrawalSettings.minimum_points.toLocaleString()} points required to exchange
              </p>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-4 space-y-4 animate-fade-in">
            {/* Theme Toggle */}
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted">
                      {theme === "dark" ? (
                        <Moon className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Sun className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === "dark" ? "Currently enabled" : "Currently disabled"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>


            {/* Referral */}
            <ReferralSection />

            {/* Links */}
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-2">
                <SettingItem 
                  icon={Mail}
                  label="AI Assistant"
                  onClick={() => navigate("/ai-chat")}
                />
                <Separator className="my-1" />
                {isAdmin && (
                  <>
                    <SettingItem 
                      icon={Shield}
                      label="Admin Dashboard"
                      onClick={() => navigate("/admin")}
                    />
                    <Separator className="my-1" />
                  </>
                )}
                <SettingItem 
                  icon={FileText}
                  label="Terms & Policy"
                  onClick={() => navigate("/terms")}
                />
                <Separator className="my-1" />
                <SettingItem 
                  icon={Mail}
                  label="Contact Us"
                  onClick={() => navigate("/contact")}
                />
              </CardContent>
            </Card>

            {/* Logout */}
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-2">
                <SettingItem 
                  icon={LogOut}
                  label="Logout"
                  variant="danger"
                  onClick={signOut}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <SpinnerWheel
        open={spinnerOpen}
        onOpenChange={setSpinnerOpen}
        onPointsWon={() => {
          loadProfile();
        }}
      />

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      )}

      {/* Delete Photo Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile photo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAvatar}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast({
                  title: "Contact Support",
                  description: "Please contact support to delete your account",
                });
                setDeleteAccountDialogOpen(false);
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Premium Features Dialog */}
      <PremiumFeaturesDialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen} />

      <BottomNav />
    </MobileLayout>
  );
};

export default Account;