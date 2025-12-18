import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import VerificationBadge from "@/components/VerificationBadge";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadConversations();
      loadAllUsers();
    }
  }, [user]);

  const loadAllUsers = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, name, points")
      .neq("id", user.id)
      .order("name");

    if (data) {
      setAllUsers(data);
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

      setConversations(enrichedConvs);
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
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users to chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-12"
          />
        </div>

        {/* Search Results */}
        {searchQuery && filteredUsers.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Start New Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {filteredUsers.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  onClick={() => navigate(`/chat/${u.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl",
                    "hover:bg-muted/50 transition-all duration-200"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{u.name}</span>
                      <VerificationBadge points={u.points} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {u.points.toLocaleString()} points
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Conversations */}
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
                  Search for users to start chatting
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
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {conv.other_user.name.charAt(0).toUpperCase()}
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
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message
                        ? conv.last_message.is_deleted
                          ? "Message deleted"
                          : conv.last_message.content
                        : "No messages yet"}
                    </p>
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
