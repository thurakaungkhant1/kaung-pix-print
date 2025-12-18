import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Coins, Calendar, MessageCircle, Trophy, Users, UserPlus, Clock, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import VerificationBadge, { VERIFICATION_THRESHOLD } from "@/components/VerificationBadge";
import BottomNav from "@/components/BottomNav";
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

interface PublicProfileData {
  id: string;
  name: string;
  points: number;
  created_at: string;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "friends">("none");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendFriendRequest, getFriendshipStatus, acceptRequest, unfriend } = useFriendRequests();
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadRank();
      loadFriendCount();
      if (user && !isOwnProfile) {
        checkFriendStatus();
      }
    }
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, name, points, created_at")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const loadRank = async () => {
    if (!userId) return;

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();

    if (userProfile) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("points", userProfile.points);

      setRank((count || 0) + 1);
    }
  };

  const loadFriendCount = async () => {
    if (!userId) return;

    const { count } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    setFriendCount(count || 0);
  };

  const checkFriendStatus = async () => {
    if (!userId) return;
    const status = await getFriendshipStatus(userId);
    setFriendStatus(status);
  };

  const handleAddFriend = async () => {
    if (!userId) return;
    const success = await sendFriendRequest(userId);
    if (success) {
      setFriendStatus("pending_sent");
    }
  };

  const handleMessage = () => {
    if (profile && friendStatus === "friends") {
      navigate(`/chat/${profile.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">User not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isVerified = profile.points >= VERIFICATION_THRESHOLD;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold">Profile</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Profile Card */}
        <Card className={cn(
          "relative overflow-hidden border-0",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          "animate-slide-up"
        )}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          
          <CardContent className="pt-8 pb-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold",
                isVerified 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-4 ring-blue-400/30" 
                  : "bg-primary/20 text-primary"
              )}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                  <VerificationBadge points={profile.points} size="lg" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-display font-bold">{profile.name}</h2>
              <VerificationBadge points={profile.points} size="md" />
            </div>

            {/* Verification Status */}
            {isVerified && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-4">
                <VerificationBadge points={profile.points} size="sm" showTooltip={false} />
                Verified Member
              </div>
            )}

            {/* Stats Grid - 4 columns now */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              <div className="bg-background/50 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                <p className="text-lg font-bold text-primary">
                  {profile.points.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              
              <div className="bg-background/50 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-lg font-bold text-green-500">
                  {friendCount}
                </p>
                <p className="text-xs text-muted-foreground">Friends</p>
              </div>
              
              <div className="bg-background/50 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Trophy className="h-4 w-4 text-accent" />
                </div>
                <p className="text-lg font-bold text-accent">
                  #{rank || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Rank</p>
              </div>
              
              <div className="bg-background/50 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">
                  {new Date(profile.created_at).toLocaleDateString([], { 
                    month: "short", 
                    year: "numeric" 
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Joined</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Since Card */}
        <Card className="premium-card animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-semibold">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
            {/* Message Button */}
            <Button
              className={cn(
                "h-12 rounded-xl",
                friendStatus !== "friends" && "opacity-50"
              )}
              onClick={handleMessage}
              disabled={friendStatus !== "friends"}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Message
            </Button>

            {/* Add Friend / Status Button */}
            {friendStatus === "none" && (
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                onClick={handleAddFriend}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Add Friend
              </Button>
            )}
            {friendStatus === "pending_sent" && (
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                disabled
              >
                <Clock className="mr-2 h-5 w-5" />
                Request Sent
              </Button>
            )}
            {friendStatus === "pending_received" && (
              <Button
                variant="outline"
                className="h-12 rounded-xl text-green-600 border-green-600 hover:bg-green-50"
                onClick={async () => {
                  // Find and accept the pending request
                  const { data } = await supabase
                    .from("friend_requests")
                    .select("id")
                    .eq("sender_id", userId)
                    .eq("receiver_id", user?.id)
                    .eq("status", "pending")
                    .single();
                  
                  if (data) {
                    await acceptRequest(data.id);
                    setFriendStatus("friends");
                  }
                }}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Accept Request
              </Button>
            )}
            {friendStatus === "friends" && (
              <Button
                variant="outline"
                className="h-12 rounded-xl text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setUnfriendDialogOpen(true)}
              >
                <UserMinus className="mr-2 h-5 w-5" />
                Unfriend
              </Button>
            )}
          </div>
        )}

        {/* Disabled message hint */}
        {!isOwnProfile && friendStatus !== "friends" && (
          <p className="text-xs text-center text-muted-foreground animate-slide-up" style={{ animationDelay: "150ms" }}>
            {friendStatus === "none" && "Add as friend to send messages"}
            {friendStatus === "pending_sent" && "Waiting for friend request to be accepted"}
            {friendStatus === "pending_received" && "Accept the friend request to chat"}
          </p>
        )}

        {isOwnProfile && (
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl animate-slide-up"
            style={{ animationDelay: "100ms" }}
            onClick={() => navigate("/account")}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {profile?.name} from your friends? You'll need to send a new friend request to chat again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (userId) {
                  const success = await unfriend(userId);
                  if (success) {
                    setFriendStatus("none");
                  }
                }
                setUnfriendDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default PublicProfile;
