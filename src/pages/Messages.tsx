import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Loader2,
  Trash2,
  X,
  UserPlus,
  UserCheck,
  UserX,
  Ban,
  Users,
  Inbox,
  Compass,
  MessageSquare,
  Clock,
  Filter,
  Wifi,
  Coins,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import MobileLayout from "@/components/MobileLayout";
import { getOrCreateConversation } from "@/lib/chat";
import {
  getFriendStatus,
  sendFriendRequest,
  cancelFriendRequest,
  respondFriendRequest,
  unfriend,
  FriendStatus,
} from "@/lib/friendship";
import { usePresenceMap, formatLastSeenExact } from "@/hooks/usePresence";
import { toast } from "sonner";

interface ConvRow {
  id: string;
  participant1_id: string;
  participant2_id: string;
  updated_at: string;
  other: { id: string; name: string; avatar_url: string | null; last_seen_at: string | null; total_coins?: number | null } | null;
  last?: { content: string; created_at: string; sender_id: string } | null;
}

interface UserRow {
  id: string;
  name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  total_coins?: number | null;
}

interface FRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  other: UserRow | null;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const online = usePresenceMap();

  const [tab, setTab] = useState(searchParams.get("tab") || "chats");
  const [blockedList, setBlockedList] = useState<UserRow[]>([]);

  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const [filter, setFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [blockedSheetOpen, setBlockedSheetOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverSort, setDiscoverSort] = useState<"recent" | "newest" | "name">("newest");
  const [discoverResults, setDiscoverResults] = useState<UserRow[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);


  const [friends, setFriends] = useState<UserRow[]>([]);
  const [friendRowByOther, setFriendRowByOther] = useState<Record<string, string>>({});
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [incoming, setIncoming] = useState<FRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FRequest[]>([]);

  const [statusMap, setStatusMap] = useState<Record<string, FriendStatus>>({});
  const [acting, setActing] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ConvRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---------- Loaders ----------
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: list } = await supabase
      .from("conversations")
      .select("id, participant1_id, participant2_id, updated_at")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    const rows: ConvRow[] = await Promise.all(
      (list || []).map(async (c) => {
        const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
        const [{ data: profile }, { data: lastMsg }] = await Promise.all([
          supabase
            .from("public_profiles")
            .select("id, name, avatar_url, last_seen_at, total_coins")
            .eq("id", otherId)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        return { ...c, other: profile ?? null, last: lastMsg ?? null };
      })
    );
    setConvs(rows);
    setLoadingConvs(false);
  }, [user]);

  const loadFriendsAndRequests = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const { data: rows } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const accepted = (rows || []).filter((r) => r.status === "accepted");
    const incomingRows = (rows || []).filter(
      (r) => r.status === "pending" && r.receiver_id === user.id
    );
    const outgoingRows = (rows || []).filter(
      (r) => r.status === "pending" && r.sender_id === user.id
    );

    const otherIds = Array.from(
      new Set(
        (rows || []).map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id))
      )
    );
    const { data: profs } = otherIds.length
      ? await supabase
          .from("public_profiles")
          .select("id, name, avatar_url, last_seen_at, total_coins")
          .in("id", otherIds)
      : { data: [] as UserRow[] };
    const profMap = new Map((profs || []).map((p: any) => [p.id, p as UserRow]));

    const friendRowMap: Record<string, string> = {};
    const friendsList: UserRow[] = accepted
      .map((r) => {
        const oid = r.sender_id === user.id ? r.receiver_id : r.sender_id;
        friendRowMap[oid] = r.id;
        return profMap.get(oid) || null;
      })
      .filter((x): x is UserRow => !!x);

    setFriends(friendsList);
    setFriendRowByOther(friendRowMap);
    setIncoming(
      incomingRows.map((r) => ({
        ...r,
        other: profMap.get(r.sender_id) || null,
      })) as FRequest[]
    );
    setOutgoing(
      outgoingRows.map((r) => ({
        ...r,
        other: profMap.get(r.receiver_id) || null,
      })) as FRequest[]
    );

    // Build a status map for quick lookups
    const map: Record<string, FriendStatus> = {};
    accepted.forEach((r) => {
      const oid = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      map[oid] = "accepted";
    });
    incomingRows.forEach((r) => (map[r.sender_id] = "pending_in"));
    outgoingRows.forEach((r) => (map[r.receiver_id] = "pending_out"));
    setStatusMap(map);
    setLoadingFriends(false);
  }, [user]);

  const loadBlocked = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const ids = (rows || []).map((r: any) => r.blocked_id);
    if (ids.length === 0) {
      setBlockedList([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, last_seen_at")
      .in("id", ids);
    setBlockedList((profs || []) as UserRow[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    loadFriendsAndRequests();
    loadBlocked();

    const ch = supabase
      .channel(`messages-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        loadConversations()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "conversations" },
        (payload: any) => setConvs((p) => p.filter((c) => c.id !== payload.old?.id))
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () =>
        loadConversations()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () =>
        loadFriendsAndRequests()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => {
        loadFriendsAndRequests();
        loadBlocked();
      })
      .subscribe();
    // Refresh conversation list every 30s so last_seen timestamps stay current
    const refreshTimer = setInterval(() => loadConversations(), 30_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(refreshTimer);
    };
  }, [user, loadConversations, loadFriendsAndRequests, loadBlocked]);

  // Keep ?tab= in sync
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ---------- Discover search ----------
  useEffect(() => {
    if (tab !== "discover") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setDiscoverLoading(true);
      const { data, error } = await supabase.rpc("search_public_profiles", {
        q: discoverQuery.trim() || null,
        sort_by: discoverSort,
        limit_count: 60,
      });
      if (!cancelled) {
        if (error) {
          // Fallback to view if RPC unavailable
          let q = supabase
            .from("public_profiles")
            .select("id, name, avatar_url, last_seen_at, total_coins")
            .neq("id", user?.id ?? "")
            .limit(60);
          if (discoverQuery.trim()) q = q.ilike("name", `%${discoverQuery.trim()}%`);
          if (discoverSort === "newest") q = q.order("created_at", { ascending: false });
          else if (discoverSort === "name") q = q.order("name", { ascending: true });
          else q = q.order("last_seen_at", { ascending: false, nullsFirst: false });
          const { data: fb } = await q;
          setDiscoverResults((fb || []) as UserRow[]);
        } else {
          setDiscoverResults((data || []) as UserRow[]);
        }
        setDiscoverLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [discoverQuery, discoverSort, tab, user]);


  // ---------- Actions ----------
  const handleSendRequest = async (otherId: string) => {
    if (!user) return;
    setActing(otherId);
    const { error } = await sendFriendRequest(user.id, otherId);
    setActing(null);
    if (error) toast.error("Send failed", { description: error.message });
    else {
      toast.success("Friend request sent");
      setStatusMap((m) => ({ ...m, [otherId]: "pending_out" }));
      loadFriendsAndRequests();
    }
  };

  const handleRespond = async (rowId: string, otherId: string, accept: boolean) => {
    setActing(otherId);
    const { error } = await respondFriendRequest(rowId, accept);
    setActing(null);
    if (error) toast.error("Failed", { description: error.message });
    else {
      toast.success(accept ? "Friend request accepted" : "Request rejected");
      loadFriendsAndRequests();
    }
  };

  const handleCancel = async (rowId: string, otherId: string) => {
    setActing(otherId);
    const { error } = await cancelFriendRequest(rowId);
    setActing(null);
    if (error) toast.error("Cancel failed", { description: error.message });
    else {
      setStatusMap((m) => {
        const n = { ...m };
        delete n[otherId];
        return n;
      });
      loadFriendsAndRequests();
    }
  };

  const handleUnfriend = async (otherId: string) => {
    const rowId = friendRowByOther[otherId];
    if (!rowId) return;
    setActing(otherId);
    const { error } = await unfriend(rowId);
    setActing(null);
    if (error) toast.error("Failed", { description: error.message });
    else {
      toast.success("Removed friend");
      loadFriendsAndRequests();
    }
  };

  const handleBlock = async (otherId: string) => {
    if (!user) return;
    setActing(otherId);
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: otherId });
    setActing(null);
    if (error) toast.error("Block failed", { description: error.message });
    else {
      toast.success("User blocked");
      setStatusMap((m) => ({ ...m, [otherId]: "blocked" }));
      loadBlocked();
    }
  };

  const handleUnblock = async (otherId: string) => {
    if (!user) return;
    setActing(otherId);
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherId);
    setActing(null);
    if (error) toast.error("Unblock failed", { description: error.message });
    else {
      toast.success("User unblocked", { description: "ယခု message ပြန်ပို့လို့ ရပါပြီ" });
      setStatusMap((m) => {
        const n = { ...m };
        delete n[otherId];
        return n;
      });
      setBlockedList((p) => p.filter((u) => u.id !== otherId));
    }
  };

  const openChatWith = async (otherId: string) => {
    if (!user) return;
    // require friendship
    const { status } = await getFriendStatus(user.id, otherId);
    if (status !== "accepted") {
      if (status === "blocked") {
        toast.error("Cannot message", { description: "Blocked." });
        return;
      }
      toast.info("Send a friend request first", {
        description: "Messaging is enabled after the request is accepted.",
      });
      // auto-send if no relation yet
      if (status === "none") await handleSendRequest(otherId);
      return;
    }
    const id = await getOrCreateConversation(user.id, otherId);
    if (id) navigate(`/messages/${id}`);
  };

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const filteredConvs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let base = convs;
    if (q)
      base = base.filter((c) => {
        const name = c.other?.name?.toLowerCase() || "";
        const last = c.last?.content?.toLowerCase() || "";
        return name.includes(q) || last.includes(q);
      });
    if (onlineOnly) base = base.filter((c) => c.other && online.has(c.other.id));
    if (friendsOnly) base = base.filter((c) => c.other && friendIds.has(c.other.id));
    return [...base].sort((a, b) => {
      const aOn = a.other ? (online.has(a.other.id) ? 1 : 0) : 0;
      const bOn = b.other ? (online.has(b.other.id) ? 1 : 0) : 0;
      if (aOn !== bOn) return bOn - aOn;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [convs, filter, online, onlineOnly, friendsOnly, friendIds]);

  const groupedConvs = useMemo(() => {
    const onlineGroup: ConvRow[] = [];
    const offlineGroup: ConvRow[] = [];
    for (const c of filteredConvs) {
      if (c.other && online.has(c.other.id)) onlineGroup.push(c);
      else offlineGroup.push(c);
    }
    return { onlineGroup, offlineGroup };
  }, [filteredConvs, online]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) toast.error("Delete failed", { description: error.message });
    else {
      setConvs((p) => p.filter((c) => c.id !== deleteTarget.id));
      toast.success("Chat deleted");
    }
    setDeleteTarget(null);
  };

  // ---------- UI helpers ----------
  const PresenceDot = ({ id }: { id: string }) => {
    const isOn = online.has(id);
    return (
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background ${
          isOn ? "bg-emerald-500" : "bg-muted-foreground/40"
        }`}
        title={isOn ? "Online" : "Offline"}
      />
    );
  };

  const FriendCard = ({
    u,
    showActions = true,
  }: {
    u: UserRow;
    showActions?: boolean;
  }) => {
    const status = statusMap[u.id] || "none";
    const isOn = online.has(u.id);
    const isFriend = status === "accepted";
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="h-16 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        <div className="px-4 pb-4 -mt-8">
          <div className="relative w-fit">
            <Avatar className="h-16 w-16 ring-4 ring-card">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg">
                {u.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {isFriend && <PresenceDot id={u.id} />}
          </div>
          <div className="mt-2">
            <p className="font-semibold text-sm truncate">{u.name || "Unnamed"}</p>
            {isFriend ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {isOn ? "online" : formatLastSeenExact(u.last_seen_at)}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70">Not friends yet</p>
            )}
            {typeof u.total_coins === "number" && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                <Coins className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {new Intl.NumberFormat("en-US").format(u.total_coins || 0)}
                </span>
                <span className="text-[9px] text-amber-700/70 dark:text-amber-300/70">coins</span>
              </div>
            )}
          </div>

          {showActions && (
            <div className="mt-3 flex gap-2">
              {status === "accepted" ? (
                <>
                  <Button
                    size="sm"
                    className="flex-1 rounded-full text-xs h-8"
                    onClick={() => openChatWith(u.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs h-8 px-3"
                    onClick={() => handleUnfriend(u.id)}
                    disabled={acting === u.id}
                  >
                    {acting === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserX className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </>
              ) : status === "pending_out" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-full text-xs h-8"
                  disabled
                >
                  <Clock className="h-3.5 w-3.5 mr-1" /> Request sent
                </Button>
              ) : status === "pending_in" ? (
                <Button
                  size="sm"
                  className="flex-1 rounded-full text-xs h-8 bg-emerald-600 hover:bg-emerald-600/90"
                  onClick={() => {
                    const row = incoming.find((r) => r.sender_id === u.id);
                    if (row) handleRespond(row.id, u.id, true);
                  }}
                  disabled={acting === u.id}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Accept
                </Button>
              ) : status === "blocked" ? (
                <Button size="sm" variant="outline" className="flex-1 rounded-full text-xs h-8" disabled>
                  <Ban className="h-3.5 w-3.5 mr-1" /> Blocked
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 rounded-full text-xs h-8"
                  onClick={() => handleSendRequest(u.id)}
                  disabled={acting === u.id}
                >
                  {acting === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Friend
                    </>
                  )}
                </Button>
              )}
              {status !== "blocked" && status !== "accepted" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-xs h-8 px-3 text-destructive hover:bg-destructive/10"
                  onClick={() => handleBlock(u.id)}
                  disabled={acting === u.id}
                  title="Block"
                >
                  <Ban className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalRequests = incoming.length;

  return (
    <MobileLayout className="flex flex-col bg-background relative overflow-hidden">
      {/* Ambient luxe glow */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[280px] bg-primary/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-[300px] h-[260px] bg-primary/10 blur-[120px] rounded-full" />

      <header className="relative z-10 px-5 pt-4 pb-3 sticky top-0 backdrop-blur-2xl bg-background/70 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-foreground/80" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_18px_-4px_hsl(var(--primary)/0.4)]">
            <MessageCircle className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold tracking-tight leading-none">Messages</h1>
            <p className="text-[10px] text-muted-foreground/70 mt-1 tracking-wider uppercase">Private · Encrypted</p>
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col relative z-10">
        <div className="px-4 pt-3">
          <TabsList className="grid grid-cols-4 h-11 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/5 p-1 w-full">
            <TabsTrigger value="chats" className="rounded-xl text-xs gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] data-[state=active]:font-semibold transition-all">
              <Inbox className="h-3.5 w-3.5" /> Chats
            </TabsTrigger>
            <TabsTrigger value="friends" className="rounded-xl text-xs gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] data-[state=active]:font-semibold transition-all">
              <Users className="h-3.5 w-3.5" /> Friends
            </TabsTrigger>
            <TabsTrigger value="discover" className="rounded-xl text-xs gap-1 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] data-[state=active]:font-semibold transition-all">
              <Compass className="h-3.5 w-3.5" /> Discover
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl text-xs gap-1 relative data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] data-[state=active]:font-semibold transition-all">
              <UserPlus className="h-3.5 w-3.5" /> Requests
              {totalRequests > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground border-2 border-background">
                  {totalRequests}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* CHATS TAB */}
        <TabsContent value="chats" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="px-4 pt-4 pb-2 space-y-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name or message…"
                className="pl-11 pr-10 h-12 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-primary/40 focus:bg-white/[0.05] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 transition-all"
              />
              {filter && (
                <button
                  onClick={() => setFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/5"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <button
                onClick={() => setOnlineOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                  onlineOnly
                    ? "bg-primary/15 border-primary/30 text-primary shadow-[0_0_15px_-4px_hsl(var(--primary)/0.5)]"
                    : "bg-white/[0.03] border-white/5 text-muted-foreground hover:border-primary/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${onlineOnly ? "bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground/40"}`} />
                Online only
              </button>
              <button
                onClick={() => setFriendsOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                  friendsOnly
                    ? "bg-primary/15 border-primary/30 text-primary shadow-[0_0_15px_-4px_hsl(var(--primary)/0.5)]"
                    : "bg-white/[0.03] border-white/5 text-muted-foreground hover:border-primary/20"
                }`}
              >
                <UserCheck className="h-3 w-3" /> Friends only
              </button>
              {(onlineOnly || friendsOnly) && (
                <button
                  onClick={() => {
                    setOnlineOnly(false);
                    setFriendsOnly(false);
                  }}
                  className="flex items-center gap-1 px-2 h-8 rounded-full text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
              <button
                onClick={() => setBlockedSheetOpen(true)}
                className="ml-auto flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-medium border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/10 whitespace-nowrap"
              >
                <Ban className="h-3 w-3" /> Blocked
                {blockedList.length > 0 && (
                  <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {blockedList.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-16 px-8 flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-inner">
                    <MessageCircle className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {filter ? "ရှာဖွေမှု ရလဒ်မရှိပါ" : "စကားပြောစရာ မရှိသေးပါ"}
                </h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6 max-w-[260px]">
                  Friends tab မှ သူငယ်ချင်းတွေကို မက်ဆေ့ပို့ပါ။
                </p>
                <Button
                  onClick={() => setTab("friends")}
                  className="group relative h-12 px-8 rounded-2xl font-semibold shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] active:scale-[0.98] transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Users className="h-4 w-4 mr-2 relative" /> <span className="relative">View Friends</span>
                </Button>
              </div>
            ) : (
              <div>
                {(["online", "offline"] as const).map((group) => {
                  const items =
                    group === "online" ? groupedConvs.onlineGroup : groupedConvs.offlineGroup;
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            group === "online" ? "bg-emerald-500" : "bg-muted-foreground/40"
                          }`}
                        />
                        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group === "online"
                            ? `Online · ${items.length}`
                            : `Offline · ${items.length}`}
                        </h4>
                      </div>
                      <div className="divide-y divide-border/60">
                        {items.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 hover:bg-muted/50 transition-colors"
                          >
                            <button
                              onClick={() => navigate(`/messages/${c.id}`)}
                              className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
                            >
                              <div className="relative">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={c.other?.avatar_url ?? undefined} />
                                  <AvatarFallback>
                                    {c.other?.name?.charAt(0)?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                {c.other && <PresenceDot id={c.other.id} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold truncate">
                                    {c.other?.name || "Unknown"}
                                  </p>
                                  {c.last && (
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                      {new Date(c.last.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {c.last
                                    ? c.last.content
                                    : c.other && online.has(c.other.id)
                                    ? "Active now"
                                    : formatLastSeenExact(c.other?.last_seen_at)}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(c);
                              }}
                              className="p-3 mr-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label="Delete chat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* FRIENDS TAB */}
        <TabsContent value="friends" className="flex-1 mt-0 overflow-y-auto p-3">
          {loadingFriends ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">သူငယ်ချင်း မရှိသေးပါ</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover မှ user တွေကို Add Friend လုပ်ပါ။
              </p>
              <Button onClick={() => setTab("discover")} className="rounded-full">
                <Compass className="h-4 w-4 mr-1" /> Discover users
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {friends.map((u) => (
                <FriendCard key={u.id} u={u} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* DISCOVER TAB */}
        <TabsContent value="discover" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <div className="px-3 pt-3 pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="Search by name or phone number…"
                className="pl-9 pr-9 h-10 rounded-full"
                inputMode="search"
              />
              {discoverQuery && (
                <button
                  onClick={() => setDiscoverQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Sort
              </span>
              {([
                { key: "newest", label: "Newest" },
                { key: "recent", label: "Recently active" },
                { key: "name", label: "Name A–Z" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDiscoverSort(opt.key)}
                  className={`px-3 h-7 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all ${
                    discoverSort === opt.key
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-white/[0.03] border-white/5 text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                {discoverResults.length} {discoverResults.length === 1 ? "user" : "users"}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {discoverLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : discoverResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">User မတွေ့ပါ</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {discoverResults.map((u) => (
                  <FriendCard key={u.id} u={u} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* REQUESTS TAB */}
        <TabsContent value="requests" className="flex-1 mt-0 overflow-y-auto p-3 space-y-4">
          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">
              Incoming ({incoming.length})
            </h3>
            {incoming.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                friend request အသစ် မရှိပါ
              </p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border bg-card"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={r.other?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {r.other?.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {r.other && <PresenceDot id={r.other.id} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{r.other?.name || "User"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        wants to be your friend
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="rounded-full h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-600/90"
                        onClick={() => handleRespond(r.id, r.sender_id, true)}
                        disabled={acting === r.sender_id}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8 px-3 text-xs"
                        onClick={() => handleRespond(r.id, r.sender_id, false)}
                        disabled={acting === r.sender_id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1">
              Sent ({outgoing.length})
            </h3>
            {outgoing.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                ပို့ထားသော request မရှိပါ
              </p>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border bg-card"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={r.other?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {r.other?.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {r.other && <PresenceDot id={r.other.id} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{r.other?.name || "User"}</p>
                      <p className="text-[11px] text-muted-foreground">Pending…</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-8 px-3 text-xs"
                      onClick={() => handleCancel(r.id, r.receiver_id)}
                      disabled={acting === r.receiver_id}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 px-1 flex items-center gap-1">
              <Ban className="h-3 w-3" /> Blocked ({blockedList.length})
            </h3>
            {blockedList.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Block လုပ်ထားသော user မရှိပါ
              </p>
            ) : (
              <div className="space-y-2">
                {blockedList.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border bg-card"
                  >
                    <Avatar className="h-12 w-12 opacity-70">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{u.name || "User"}</p>
                      <p className="text-[11px] text-muted-foreground">Blocked</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-8 px-3 text-xs"
                      onClick={() => handleUnblock(u.id)}
                      disabled={acting === u.id}
                    >
                      {acting === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Unblock"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.other?.name
                ? `${deleteTarget.other.name} နှင့် စကားပြောထားသမျှ message အားလုံး အပြီးတိုင် ဖျက်ပစ်ပါမည်။`
                : "Message အားလုံး အပြီးတိုင် ဖျက်ပစ်ပါမည်။"}{" "}
              ပြန်ပြင်လို့ မရပါ။
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={blockedSheetOpen} onOpenChange={setBlockedSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" /> Blocked Users
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                ({blockedList.length})
              </span>
            </SheetTitle>
            <SheetDescription>
              Unblock လုပ်ပြီးရင် ပြန် message ပို့လို့ ရပါပြီ။
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-6">
            {blockedList.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <Ban className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Block လုပ်ထားသော user မရှိပါ
                </p>
              </div>
            ) : (
              blockedList.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border bg-card"
                >
                  <Avatar className="h-12 w-12 opacity-70">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{u.name || "User"}</p>
                    <p className="text-[11px] text-muted-foreground">Blocked</p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-4 text-xs"
                    onClick={() => handleUnblock(u.id)}
                    disabled={acting === u.id}
                  >
                    {acting === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Unblock
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
};

export default Messages;
