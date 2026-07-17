import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, MessageCircle, Coins, Loader2, UserPlus } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { getOrCreateConversation } from "@/lib/chat";
import { usePresenceMap } from "@/hooks/usePresence";
import { toast } from "sonner";

interface FriendRow {
  id: string;
  name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  total_coins: number;
  points: number;
  game_points: number;
}

const AccountChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = usePresenceMap();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id, status")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    const otherIds = (rows || []).map((r) =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id
    );
    if (otherIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }
    const { data: profs } = await supabase
      .from("public_profiles")
      .select("id, name, avatar_url, last_seen_at, points, game_points, total_coins")
      .in("id", otherIds);
    setFriends((profs || []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadFriends();
    const ch = supabase
      .channel(`account-chat-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, loadFriends)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, loadFriends)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadFriends]);

  const openChat = async (otherId: string) => {
    if (!user) return;
    setOpening(otherId);
    const id = await getOrCreateConversation(user.id, otherId);
    setOpening(null);
    if (id) navigate(`/messages/${id}`);
    else toast.error("Could not open chat");
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.name?.toLowerCase().includes(q));
  }, [friends, filter]);

  const formatCoin = (n: number) =>
    new Intl.NumberFormat("en-US").format(Math.max(0, n || 0));

  return (
    <AnimatedPage>
      <MobileLayout className="bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/account")}
              className="p-2 -ml-2 rounded-full hover:bg-muted/70"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-display font-bold truncate">Friends & Chat</h1>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {friends.length} friend{friends.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 h-10 rounded-full"
            />
          </div>
        </header>

        <div className="px-3 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-base mb-1">No friends yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover users နဲ့ friend request ပို့ပြီး chat စလိုက်ပါ
              </p>
              <Button onClick={() => navigate("/messages?tab=discover")}>
                <UserPlus className="h-4 w-4 mr-2" />
                Discover Users
              </Button>
            </div>
          ) : (
            filtered.map((f) => {
              const isOn = online.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => openChat(f.id)}
                  disabled={opening === f.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md active:scale-[0.99] transition-all text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={f.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {f.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-card ${
                        isOn ? "bg-emerald-500" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{f.name}</p>
                      {isOn && (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          online
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                        <Coins className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                          {formatCoin(f.total_coins)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">coins</span>
                    </div>
                  </div>
                  {opening === f.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 pt-2 pb-6 text-center">
          <p className="text-[11px] text-muted-foreground">
            💬 Text နဲ့ emoji များသာ ပို့နိုင်ပါသည်။ ပုံ / voice ပို့မရပါ။
          </p>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default AccountChat;
