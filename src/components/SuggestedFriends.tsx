import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Users, Sparkles, Loader2 } from "lucide-react";
import VerificationBadge from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";

interface SuggestedUser {
  id: string;
  name: string;
  points: number;
  avatar_url: string | null;
}

const SuggestedFriends = () => {
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
      // Get current user's points
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();

      const userPoints = currentProfile?.points || 0;
      const pointRange = Math.max(100, userPoints * 0.5); // 50% range or min 100

      // Get friend IDs to exclude (friends is already string[])
      const friendIds = [...friends];
      friendIds.push(user.id); // Exclude self

      // Get existing friend requests (both sent and received)
      const { data: existingRequests } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const excludeIds = new Set(friendIds);
      existingRequests?.forEach((req) => {
        excludeIds.add(req.sender_id);
        excludeIds.add(req.receiver_id);
      });

      // Find users with similar points who aren't friends
      const { data: suggestedUsers } = await supabase
        .from("profiles")
        .select("id, name, points, avatar_url")
        .gte("points", userPoints - pointRange)
        .lte("points", userPoints + pointRange)
        .not("id", "in", `(${Array.from(excludeIds).join(",")})`)
        .order("points", { ascending: false })
        .limit(10);

      setSuggestions(suggestedUsers || []);
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
      // Remove from suggestions
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
          Suggested Friends
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
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={suggestedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {suggestedUser.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
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
                <p className="text-xs text-muted-foreground">
                  {suggestedUser.points.toLocaleString()} points
                </p>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => handleAddFriend(suggestedUser.id)}
                disabled={sendingRequest === suggestedUser.id}
              >
                {sendingRequest === suggestedUser.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3" />
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
            View more suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SuggestedFriends;
