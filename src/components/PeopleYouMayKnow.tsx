import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Users, Sparkles, Loader2, MessageCircle, TrendingUp } from "lucide-react";
import VerificationBadge from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";

interface SuggestedUser {
  id: string;
  name: string;
  points: number;
  avatar_url: string | null;
  mutualFriendsCount: number;
  activityScore: number;
  recentActivity?: string;
}

const PeopleYouMayKnow = () => {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const { user } = useAuth();
  const { sendFriendRequest, friends } = useFriendRequests();
  const { isUserOnline } = useOnlineUsers();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user, friends]);

  const loadSuggestions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get current user's points and info
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      const userPoints = currentProfile?.points || 0;
      const pointRange = Math.max(200, userPoints * 0.7);

      // Get friend IDs to exclude
      const friendIds = [...friends, user.id];

      // Get existing friend requests
      const { data: existingRequests } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const excludeIds = new Set(friendIds);
      existingRequests?.forEach((req) => {
        excludeIds.add(req.sender_id);
        excludeIds.add(req.receiver_id);
      });

      // Find users with similar points
      const { data: potentialUsers } = await supabase
        .from("profiles")
        .select("id, name, points, avatar_url")
        .gte("points", userPoints - pointRange)
        .lte("points", userPoints + pointRange)
        .not("id", "in", `(${Array.from(excludeIds).join(",")})`)
        .order("points", { ascending: false })
        .limit(20);

      if (!potentialUsers || potentialUsers.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Enrich with mutual friends and activity data
      const enrichedUsers = await Promise.all(
        potentialUsers.map(async (suggestedUser) => {
          // Get suggested user's friends for mutual calculation
          const { data: theirFriends } = await supabase
            .from("friend_requests")
            .select("sender_id, receiver_id")
            .eq("status", "accepted")
            .or(`sender_id.eq.${suggestedUser.id},receiver_id.eq.${suggestedUser.id}`);

          const theirFriendIds = theirFriends?.map((req) =>
            req.sender_id === suggestedUser.id ? req.receiver_id : req.sender_id
          ) || [];

          const mutualCount = theirFriendIds.filter((id) => friends.includes(id)).length;

          // Get activity score based on recent messages and transactions
          const { count: messageCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", suggestedUser.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          const { count: transactionCount } = await supabase
            .from("point_transactions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", suggestedUser.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          const activityScore = (messageCount || 0) + (transactionCount || 0) * 2;

          let recentActivity: string | undefined;
          if (activityScore > 10) {
            recentActivity = "Very active";
          } else if (activityScore > 5) {
            recentActivity = "Active recently";
          }

          return {
            ...suggestedUser,
            mutualFriendsCount: mutualCount,
            activityScore,
            recentActivity,
          };
        })
      );

      // Sort by: mutual friends first, then activity score, then points similarity
      enrichedUsers.sort((a, b) => {
        // Prioritize mutual friends
        if (b.mutualFriendsCount !== a.mutualFriendsCount) {
          return b.mutualFriendsCount - a.mutualFriendsCount;
        }
        // Then activity score
        if (b.activityScore !== a.activityScore) {
          return b.activityScore - a.activityScore;
        }
        // Then points proximity
        const aPointsDiff = Math.abs(a.points - userPoints);
        const bPointsDiff = Math.abs(b.points - userPoints);
        return aPointsDiff - bPointsDiff;
      });

      setSuggestions(enrichedUsers.slice(0, 8));
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    setSendingRequest(userId);
    const success = await sendFriendRequest(userId);
    if (success) {
      setSuggestions((prev) => prev.filter((u) => u.id !== userId));
    }
    setSendingRequest(null);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <Sparkles className="h-4 w-4 text-primary" />
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 5).map((suggestedUser) => {
          const isOnline = isUserOnline(suggestedUser.id);
          
          return (
            <div
              key={suggestedUser.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                "bg-background/50 hover:bg-background/80 transition-colors"
              )}
            >
              <div
                className="relative cursor-pointer"
                onClick={() => navigate(`/profile/${suggestedUser.id}`)}
              >
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={suggestedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {suggestedUser.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/profile/${suggestedUser.id}`)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate text-sm">
                    {suggestedUser.name}
                  </span>
                  <VerificationBadge points={suggestedUser.points} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{suggestedUser.points.toLocaleString()} points</span>
                  {suggestedUser.mutualFriendsCount > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <Users className="h-3 w-3" />
                      {suggestedUser.mutualFriendsCount} mutual
                    </span>
                  )}
                </div>
                {suggestedUser.recentActivity && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-0.5">
                    <TrendingUp className="h-3 w-3" />
                    {suggestedUser.recentActivity}
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs shrink-0"
                onClick={() => handleAddFriend(suggestedUser.id)}
                disabled={sendingRequest === suggestedUser.id}
              >
                {sendingRequest === suggestedUser.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Add
              </Button>
            </div>
          );
        })}
        
        {suggestions.length > 5 && (
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            onClick={() => navigate("/explore")}
          >
            <Users className="h-3 w-3 mr-1.5" />
            View {suggestions.length - 5} more suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PeopleYouMayKnow;
