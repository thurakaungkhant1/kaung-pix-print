import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Ban, Wifi, WifiOff, Trash2, User, ChevronRight, Bell, BellOff, Volume2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_profile?: {
    id: string;
    name: string;
  };
}

const SOUND_ENABLED_KEY = "chat_sound_notifications_enabled";

const ChatSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActiveVisible, setIsActiveVisible] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<string | null>(null);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isOpen) {
      loadSettings();
      loadBlockedUsers();
    }
  }, [user, isOpen]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("is_active_visible")
      .eq("id", user.id)
      .single();

    if (data) {
      setIsActiveVisible(data.is_active_visible ?? true);
    }
    setLoading(false);
  };

  const loadBlockedUsers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("blocked_users")
      .select("id, blocked_id")
      .eq("blocker_id", user.id);

    if (data) {
      // Fetch profiles for blocked users
      const enriched = await Promise.all(
        data.map(async (block) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("id", block.blocked_id)
            .single();
          return { ...block, blocked_profile: profile };
        })
      );
      setBlockedUsers(enriched);
    }
  };

  const handleActiveStatusToggle = async (checked: boolean) => {
    if (!user) return;

    setIsActiveVisible(checked);

    const { error } = await supabase
      .from("profiles")
      .update({ is_active_visible: checked })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update active status visibility",
        variant: "destructive",
      });
      setIsActiveVisible(!checked);
    } else {
      toast({
        title: checked ? "Active Status On" : "Active Status Off",
        description: checked
          ? "Others can now see when you're online"
          : "Your online status is now hidden",
      });
    }
  };

  const handleSoundToggle = (checked: boolean) => {
    setIsSoundEnabled(checked);
    localStorage.setItem(SOUND_ENABLED_KEY, String(checked));
    toast({
      title: checked ? "Sound Notifications On" : "Sound Notifications Off",
      description: checked
        ? "You'll hear sounds for new messages"
        : "Message sounds are now muted",
    });
  };

  const handleTestSound = () => {
    setIsTestingSound(true);
    try {
      const audio = new Audio("/sounds/message.mp3");
      audio.volume = 0.5;
      audio.play().then(() => {
        setTimeout(() => setIsTestingSound(false), 500);
      }).catch((err) => {
        console.error("Error playing test sound:", err);
        toast({
          title: "Could not play sound",
          description: "Your browser may be blocking audio playback",
          variant: "destructive",
        });
        setIsTestingSound(false);
      });
    } catch (error) {
      setIsTestingSound(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!user || !userToUnblock) return;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userToUnblock);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Unblocked",
        description: "You can now receive messages from this user",
      });
      setBlockedUsers((prev) =>
        prev.filter((b) => b.blocked_id !== userToUnblock)
      );
    }
    setUnblockDialogOpen(false);
    setUserToUnblock(null);
  };

  return (
    <>
      <Card className="premium-card overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-muted">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  Chat Settings
                </div>
                <div className={cn(
                  "flex items-center gap-2 text-muted-foreground",
                  "transition-all duration-300"
                )}>
                  <span className="text-sm font-normal">
                    {isOpen ? "Hide" : "Show"}
                  </span>
                  <div className={cn(
                    "p-1.5 rounded-lg bg-muted transition-transform duration-300",
                    isOpen && "rotate-90"
                  )}>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <CardContent className="space-y-4 pt-0">
              {/* Sound Notifications Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  {isSoundEnabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="sound-notifications" className="text-sm font-medium">
                      Message Notification Sounds
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isSoundEnabled
                        ? "Sounds play for new messages"
                        : "Message sounds are muted"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSound}
                    disabled={isTestingSound}
                    className={cn(
                      "h-8 px-3 text-xs rounded-lg transition-all",
                      isTestingSound && "scale-95"
                    )}
                  >
                    <Volume2 className={cn(
                      "h-3.5 w-3.5 mr-1.5",
                      isTestingSound && "animate-pulse"
                    )} />
                    Test
                  </Button>
                  <Switch
                    id="sound-notifications"
                    checked={isSoundEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  {isActiveVisible ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="active-status" className="text-sm font-medium">
                      Active Status
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isActiveVisible
                        ? "Others can see when you're online"
                        : "Your online status is hidden"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="active-status"
                  checked={isActiveVisible}
                  onCheckedChange={handleActiveStatusToggle}
                />
              </div>

              <Separator />

              {/* Blocked Users */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Blocked Users</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {blockedUsers.length}
                  </span>
                </div>

                {blockedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-xl">
                    No blocked users
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {blockedUsers.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl",
                          "bg-muted/30 hover:bg-muted/50 transition-colors"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">
                            {block.blocked_profile?.name || "Unknown User"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setUserToUnblock(block.blocked_id);
                            setUnblockDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock this user? They will be able to
              send you messages again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatSettings;
