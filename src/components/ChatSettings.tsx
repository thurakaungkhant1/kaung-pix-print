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
import { Settings, Ban, Wifi, WifiOff, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
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

const ChatSettings = () => {
  const [isActiveVisible, setIsActiveVisible] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSettings();
      loadBlockedUsers();
    }
  }, [user]);

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

  if (loading) {
    return (
      <Card className="premium-card">
        <CardContent className="p-4">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-xl bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            Chat Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
