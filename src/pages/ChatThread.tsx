import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Smile, MoreVertical, Ban, UserPlus, Clock } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import ChatSettingsDialog from "@/components/ChatSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { usePresenceMap, formatLastSeen } from "@/hooks/usePresence";
import { getFriendStatus, sendFriendRequest, FriendStatus } from "@/lib/friendship";

interface Msg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface OtherProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  last_seen_at: string | null;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "❤️", "😢", "😎", "🤔", "👏"];

const ChatThread = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [other, setOther] = useState<OtherProfile | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [requestingFriend, setRequestingFriend] = useState(false);
  const online = usePresenceMap();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant1_id, participant2_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv) {
        const otherId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, last_seen_at")
          .eq("id", otherId)
          .maybeSingle();
        setOther(prof ?? null);

        // block status (both directions)
        const [{ data: mine }, { data: theirs }, fs] = await Promise.all([
          supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
          supabase.from("blocked_users").select("id").eq("blocker_id", otherId).eq("blocked_id", user.id).maybeSingle(),
          getFriendStatus(user.id, otherId),
        ]);
        setIBlockedThem(!!mine);
        setTheyBlockedMe(!!theirs);
        setFriendStatus(fs.status);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
    })();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!user || !conversationId || !input.trim() || sending) return;
    if (iBlockedThem) {
      toast({ title: "Blocked", description: "Unblock to send messages.", variant: "destructive" });
      return;
    }
    if (theyBlockedMe) {
      toast({ title: "Cannot send", description: "This user has blocked you.", variant: "destructive" });
      return;
    }
    setSending(true);
    const body = input.trim().slice(0, 2000);
    setInput("");
    setShowEmoji(false);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: body,
    });
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      setInput(body);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (e: string) => {
    setInput((v) => v + e);
    inputRef.current?.focus();
  };

  return (
    <MobileLayout className="flex flex-col bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Avatar className="h-10 w-10 ring-2 ring-primary-foreground/30">
            <AvatarImage src={other?.avatar_url ?? undefined} />
            <AvatarFallback>{other?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-display font-bold leading-tight truncate">
              {other?.name || "Chat"}
            </h1>
            <p className="text-[11px] opacity-80">
              {iBlockedThem ? "Blocked" : theyBlockedMe ? "Unavailable" : "Text & emoji only"}
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 -mr-2 rounded-full hover:bg-primary-foreground/10"
            aria-label="Chat settings"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {other && (
        <ChatSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentUserId={user!.id}
          otherUserId={other.id}
          otherName={other.name}
          onBlockedChange={(b) => setIBlockedThem(b)}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-4 bg-gradient-to-b from-background to-muted/20">
        {messages.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Smile className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">မင်္ဂလာပါ 👋</h3>
            <p className="text-sm text-muted-foreground">
              {other?.name ? `${other.name} ကို စကားစပြောလိုက်ပါ။` : "စကားစပြောလိုက်ပါ။"}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-card-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {showEmoji && (
        <div className="px-3 pb-2 border-t bg-background/95">
          <div className="grid grid-cols-6 gap-1 pt-2">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => insertEmoji(e)}
                className="text-2xl h-10 rounded-lg hover:bg-muted transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t bg-background/95 backdrop-blur sticky bottom-0">
        {(iBlockedThem || theyBlockedMe) ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <Ban className="h-4 w-4" />
            {iBlockedThem
              ? "User ကို block လုပ်ထားသည်။ Unblock လုပ်ပါ။"
              : "ဤ user မှ block လုပ်ထားသည်။"}
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-full flex-shrink-0"
              onClick={() => setShowEmoji((v) => !v)}
              aria-label="Toggle emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="စာရိုက်ပါ…"
              maxLength={2000}
              className="h-11 rounded-full px-4"
            />
            <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 rounded-full flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ChatThread;
