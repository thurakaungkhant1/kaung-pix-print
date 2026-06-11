import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ArrowLeft, MessageCircle, Search, Plus, Loader2, Trash2, X } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { getOrCreateConversation } from "@/lib/chat";
import { toast } from "sonner";

interface ConvRow {
  id: string;
  participant1_id: string;
  participant2_id: string;
  updated_at: string;
  other: { id: string; name: string; avatar_url: string | null } | null;
  last?: { content: string; created_at: string; sender_id: string } | null;
}

interface UserRow {
  id: string;
  name: string;
  avatar_url: string | null;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConvRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadConversations = async () => {
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
          supabase.from("profiles").select("id, name, avatar_url").eq("id", otherId).maybeSingle(),
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
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
    if (!user) return;
    const channel = supabase
      .channel(`user-convs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadConversations()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "conversations" },
        (payload: any) => {
          setConvs((prev) => prev.filter((c) => c.id !== payload.old?.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // realtime user search (for starting new chat)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .ilike("name", `%${searchTerm.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(20);
      if (!cancelled) {
        setSearchResults(data || []);
        setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchTerm, user]);

  const filteredConvs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => {
      const name = c.other?.name?.toLowerCase() || "";
      const last = c.last?.content?.toLowerCase() || "";
      return name.includes(q) || last.includes(q);
    });
  }, [convs, filter]);

  const openChatWith = async (otherId: string) => {
    if (!user) return;
    const id = await getOrCreateConversation(user.id, otherId);
    if (id) navigate(`/messages/${id}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Delete failed", { description: error.message });
    } else {
      setConvs((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Chat deleted");
    }
    setDeleteTarget(null);
  };

  return (
    <MobileLayout className="flex flex-col bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-display font-bold leading-tight">Messages</h1>
            <p className="text-[11px] opacity-80">User ချင်း စကားပြောရန်</p>
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full h-9 w-9"
            onClick={() => setNewChatOpen((v) => !v)}
            aria-label="Start new chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or message…"
            className="pl-9 pr-9 h-10 rounded-full bg-background text-foreground"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {newChatOpen && (
          <div className="mt-2 relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find user to start a new chat…"
              className="pl-9 h-10 rounded-full bg-background text-foreground"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {newChatOpen && searchTerm.trim() ? (
          <div className="p-3 space-y-1">
            {searching && (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> ရှာနေသည်…
              </div>
            )}
            {!searching && searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">User မတွေ့ပါ</p>
            )}
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => openChatWith(u.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback>{u.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-medium truncate">{u.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">Tap to chat</p>
                </div>
              </button>
            ))}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">
              {filter ? "ရှာဖွေမှု ရလဒ်မရှိပါ" : "စကားပြောစရာ မရှိသေးပါ"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filter
                ? "နာမည် သို့မဟုတ် စကားလုံး ပြန်ရိုက်ကြည့်ပါ။"
                : "အပေါ်က + ခလုတ်နှိပ်ပြီး user တစ်ဦးကို ရှာပါ။"}
            </p>
            {!filter && (
              <Button onClick={() => setNewChatOpen(true)} className="rounded-full">
                <Plus className="h-4 w-4 mr-1" /> Start a chat
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredConvs.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 hover:bg-muted/50 transition-colors"
              >
                <button
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={c.other?.avatar_url ?? undefined} />
                    <AvatarFallback>{c.other?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{c.other?.name || "Unknown"}</p>
                      {c.last && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(c.last.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.last ? c.last.content : "စကားစပြောရန် နှိပ်ပါ"}
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
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.other?.name
                ? `${deleteTarget.other.name} နှင့် စကားပြောထားသမျှ message အားလုံး အပြီးတိုင် ဖျက်ပစ်ပါမည်။`
                : "Message အားလုံး အပြီးတိုင် ဖျက်ပစ်ပါမည်။"}
              {" "}ပြန်ပြင်လို့ မရပါ။
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
    </MobileLayout>
  );
};

export default Messages;
