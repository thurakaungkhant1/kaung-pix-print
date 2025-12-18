import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    points: number;
  };
  receiver?: {
    id: string;
    name: string;
    points: number;
  };
}

export const useFriendRequests = () => {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadFriendRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get pending requests received
    const { data: received } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (received) {
      const enriched = await Promise.all(
        received.map(async (req) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, name, points")
            .eq("id", req.sender_id)
            .single();
          return { ...req, sender };
        })
      );
      setPendingRequests(enriched);
    }

    // Get accepted friends
    const { data: accepted } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (accepted) {
      const friendIds = accepted.map((req) =>
        req.sender_id === user.id ? req.receiver_id : req.sender_id
      );
      setFriends(friendIds);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFriendRequests();
  }, [loadFriendRequests]);

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return false;

    const { error } = await supabase.from("friend_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Request exists",
          description: "A friend request already exists with this user",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    }

    toast({
      title: "Request sent",
      description: "Friend request sent successfully",
    });
    return true;
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Accepted",
      description: "Friend request accepted",
    });
    await loadFriendRequests();
    return true;
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Rejected",
      description: "Friend request rejected",
    });
    await loadFriendRequests();
    return true;
  };

  const isFriend = (userId: string): boolean => {
    return friends.includes(userId);
  };

  const getFriendshipStatus = async (
    otherUserId: string
  ): Promise<"none" | "pending_sent" | "pending_received" | "friends"> => {
    if (!user) return "none";

    const { data } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (!data) return "none";
    if (data.status === "accepted") return "friends";
    if (data.status === "pending") {
      return data.sender_id === user.id ? "pending_sent" : "pending_received";
    }
    return "none";
  };

  return {
    pendingRequests,
    friends,
    loading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    isFriend,
    getFriendshipStatus,
    refresh: loadFriendRequests,
  };
};