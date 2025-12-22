import { useState, useEffect, useRef } from "react";
import { Inbox, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useSoundNotification } from "@/hooks/useSoundNotification";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import VerificationBadge from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FriendRequestInbox = () => {
  const [open, setOpen] = useState(false);
  const { pendingRequests, acceptRequest, rejectRequest, loading, refresh } =
    useFriendRequests();
  const { playFriendRequestSound } = useSoundNotification();
  const { notifyFriendRequest, requestPermission } = usePushNotifications();
  const { user } = useAuth();
  const prevCountRef = useRef(pendingRequests.length);
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Play sound and show notification when new requests arrive
  useEffect(() => {
    if (pendingRequests.length > prevCountRef.current) {
      playFriendRequestSound();
      
      // Find and notify for new requests
      pendingRequests.forEach((req) => {
        if (!lastNotifiedRef.current.has(req.id)) {
          notifyFriendRequest(req.sender?.name || "Someone");
          lastNotifiedRef.current.add(req.id);
        }
      });
    }
    prevCountRef.current = pendingRequests.length;
  }, [pendingRequests, playFriendRequestSound, notifyFriendRequest]);

  // Subscribe to realtime updates for friend requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("friend-requests-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friend_requests",
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const handleAccept = async (id: string) => {
    await acceptRequest(id);
  };

  const handleReject = async (id: string) => {
    await rejectRequest(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
          <Inbox className="h-5 w-5" />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-primary flex items-center justify-center px-1">
              <span className="text-[10px] font-bold text-white">
                {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
              </span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friend Requests</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading...</p>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  "bg-muted/30 hover:bg-muted/50 transition-colors"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {req.sender?.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">
                      {req.sender?.name || "Unknown"}
                    </span>
                    <VerificationBadge
                      points={req.sender?.points || 0}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wants to be your friend
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleReject(req.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleAccept(req.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendRequestInbox;
