import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VerificationBadge from "@/components/VerificationBadge";
import OnlineStatus from "@/components/OnlineStatus";
import FriendRequestInbox from "@/components/FriendRequestInbox";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { useFriendRequests } from "@/hooks/useFriendRequests";

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  updated_at: string;
  other_user: {
    id: string;
    name: string;
    points: number;
  };
  last_message?: {
    content: string;
    created_at: string;
    is_deleted: boolean;
  };
}

interface UserProfile {
  id: string;
  name: string;
  points: number;
}

const ChatList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { friends, isFriend, sendFriendRequest, getFriendshipStatus } = useFriendRequests();
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (user) {
      loadConversations();
      loadAllUsers();
    }
  }, [user, friends]);

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const loadAllUsers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, name, points")
      .neq("id", user.id)
      .order("name");

    if (data) {
      setAllUsers(data);
      // Load friendship status for each user
      const statuses = new Map<string, string>();
      await Promise.all(
        data.map(async (u) => {
          const status = await getFriendshipStatus(u.id);
          statuses.set(u.id, status);
        })
      );
      setFriendshipStatuses(statuses);
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (convs) {
      const enrichedConvs = await Promise.all(
        convs.map(async (conv) => {
          const otherId =
            conv.participant1_id === user.id
              ? conv.participant2_id
              : conv.participant1_id;

          const { data: otherUser } = await supabase
            .from("profiles")
            .select("id, name, points")
            .eq("id", otherId)
            .single();

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, is_deleted")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            other_user: otherUser || { id: otherId, name: "Unknown", points: 0 },
            last_message: lastMsg || undefined,
          };
        })
      );

      // Filter to show only friend conversations
      const friendConvs = enrichedConvs.filter((conv) =>
        isFriend(conv.other_user.id)
      );
      setConversations(friendConvs);
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !conversations.some((c) => c.other_user.id === u.id)
  );

  const handleUserClick = async (userId: string) => {
    const status = friendshipStatuses.get(userId);
    if (status === "friends") {
      navigate(`/chat/${userId}`);
    } else if (status === "none") {
      await sendFriendRequest(userId);
      // Refresh statuses
      const newStatus = await getFriendshipStatus(userId);
      setFriendshipStatuses((prev) => new Map(prev).set(userId, newStatus));
    }
  };

  const getActionButton = (userId: string) => {
    const status = friendshipStatuses.get(userId);
    switch (status) {
      case "friends":
        return (
          <Button size="sm" variant="outline" className="text-xs">
            Chat
          </Button>
        );
      case "pending_sent":
        return (
          <Button size="sm" variant="ghost" disabled className="text-xs">
            Pending
          </Button>
        );
      case "pending_received":
        return (
          <Button size="sm" variant="secondary" className="text-xs">
            Accept
          </Button>
        );
      default:
        return (
          <Button size="sm" variant="outline" className="text-xs gap-1">
            <UserPlus className="h-3 w-3" />
            Add
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - hides on scroll */}
      <header className={cn(
        "sticky top-0 z-40 bg-gradient-primary text-primary-foreground p-4 shadow-lg transition-all duration-300",
        !isHeaderVisible && "opacity-0 -translate-y-full"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </h1>
          </div>
          <FriendRequestInbox />
        </div>
      </header>

      <div className={cn(
        "max-w-screen-xl mx-auto p-4 space-y-4 transition-all duration-300",
        !isHeaderVisible && "pt-2"
      )}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-12"
          />
        </div>

        {/* Search Results - Show all users when searching */}
        {searchQuery && filteredUsers.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {filteredUsers.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl",
                    "hover:bg-muted/50 transition-all duration-200"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{u.name}</span>
                      <VerificationBadge points={u.points} size="sm" />
                    </div>
                    <OnlineStatus userId={u.id} size="sm" />
                  </div>
                  {getActionButton(u.id)}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Friend Conversations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Add friends to start chatting
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.other_user.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl",
                    "hover:bg-muted/50 transition-all duration-200"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {conv.other_user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">
                          {conv.other_user.name}
                        </span>
                        <VerificationBadge
                          points={conv.other_user.points}
                          size="sm"
                        />
                      </div>
                      {conv.last_message && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message
                          ? conv.last_message.is_deleted
                            ? "Message deleted"
                            : conv.last_message.content
                          : "No messages yet"}
                      </p>
                      <OnlineStatus userId={conv.other_user.id} showLabel={false} size="sm" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default ChatList;