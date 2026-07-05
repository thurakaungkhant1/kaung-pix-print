import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Smile, MoreVertical, Ban, UserPlus, Clock, Check, CheckCheck } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import ChatSettingsDialog from "@/components/ChatSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { usePresenceMap, formatLastSeen } from "@/hooks/usePresence";
import { getFriendStatus, sendFriendRequest, FriendStatus } from "@/lib/friendship";
import { awardChatPoints } from "@/lib/chatEarning";

interface Msg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
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
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [otherTyping, setOtherTyping] = useState(false);
  const online = usePresenceMap();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const otherTypingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consider "online" if presence channel says so OR last_seen_at within 90s
  const isOtherOnline = !!other && (
    online.has(other.id) ||
    (!!other.last_seen_at && Date.now() - new Date(other.last_seen_at).getTime() < 90_000)
  );

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
          .from("public_profiles")
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
        .select("id, conversation_id, sender_id, content, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);

      // Mark received messages as read
      if (user && msgs && msgs.length) {
        const unreadIds = msgs.filter((m: any) => m.sender_id !== user.id && !m.read_at).map((m: any) => m.id);
        if (unreadIds.length) {
          await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
        }
      }
    })();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload: any) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          // If incoming message is from the other user, mark it as read immediately
          if (user && payload.new.sender_id !== user.id) {
            await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", payload.new.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_users" },
        async () => {
          const { data: conv } = await supabase
            .from("conversations")
            .select("participant1_id, participant2_id")
            .eq("id", conversationId)
            .maybeSingle();
          if (!conv || !user) return;
          const otherId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
          const [{ data: mine }, { data: theirs }] = await Promise.all([
            supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
            supabase.from("blocked_users").select("id").eq("blocker_id", otherId).eq("blocked_id", user.id).maybeSingle(),
          ]);
          setIBlockedThem(!!mine);
          setTheyBlockedMe(!!theirs);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        async () => {
          const { data: conv } = await supabase
            .from("conversations")
            .select("participant1_id, participant2_id")
            .eq("id", conversationId)
            .maybeSingle();
          if (!conv || !user) return;
          const otherId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
          const fs = await getFriendStatus(user.id, otherId);
          setFriendStatus(fs.status);
        }
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (!user || payload?.payload?.user_id === user.id) return;
        setOtherTyping(true);
        if (otherTypingClearRef.current) clearTimeout(otherTypingClearRef.current);
        otherTypingClearRef.current = setTimeout(() => setOtherTyping(false), 3500);
      })
      .on("broadcast", { event: "stop_typing" }, (payload: any) => {
        if (!user || payload?.payload?.user_id === user.id) return;
        setOtherTyping(false);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      if (otherTypingClearRef.current) clearTimeout(otherTypingClearRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Re-render once a minute so "X minutes ago" stays fresh without polling the DB
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);



  // Tick for cooldown countdown
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) {
        setCooldownUntil(null);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

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
    if (friendStatus !== "accepted") {
      toast({
        title: "Not friends yet",
        description: "Friend request လက်ခံပြီးမှသာ message ပို့လို့ ရပါသည်။",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const body = input.trim().slice(0, 2000);
    setInput("");
    setShowEmoji(false);
    sendStopTyping();

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
      // Reward small coin for active chatting (capped per day, rate-limited)
      const result = await awardChatPoints(user.id, body);
      if (result.amount > 0) {
        toast({ title: `+${result.amount} coin`, description: "Chat reward earned" });
        setCooldownUntil(null);
      } else if (result.reason === "vpn_required") {
        toast({ title: "VPN required", description: "Turn on VPN to earn chat coins." });
      } else if (result.reason === "cooldown" && result.cooldownRemaining) {
        setCooldownUntil(Date.now() + result.cooldownRemaining * 1000);
      } else if (result.reason === "daily_cap") {
        toast({ title: "Daily cap reached", description: "Come back tomorrow for more chat coins." });
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (e: string) => {
    setInput((v) => v + e);
    inputRef.current?.focus();
  };

  const broadcastTyping = () => {
    if (!user || !channelRef.current) return;
    const t = Date.now();
    // throttle to once every 1.5s
    if (t - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = t;
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: user.id },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      channelRef.current?.send({
        type: "broadcast",
        event: "stop_typing",
        payload: { user_id: user.id },
      });
    }, 2500);
  };

  const sendStopTyping = () => {
    if (!user || !channelRef.current) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    lastTypingSentRef.current = 0;
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { user_id: user.id },
    });
  };


  return (
    <MobileLayout className="flex flex-col bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-primary-foreground/30">
              <AvatarImage src={other?.avatar_url ?? undefined} />
              <AvatarFallback>{other?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            {other && (
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-primary ${
                  isOtherOnline ? "bg-emerald-400" : "bg-muted-foreground/60"
                }`}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-display font-bold leading-tight truncate">
              {other?.name || "Chat"}
            </h1>
            <p className="text-[11px] opacity-80 flex items-center gap-1">
              {iBlockedThem ? (
                "Blocked"
              ) : theyBlockedMe ? (
                "Unavailable"
              ) : otherTyping ? (
                <span className="inline-flex items-center gap-1 text-emerald-200">
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1 w-1 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1 w-1 rounded-full bg-emerald-300 animate-bounce" />
                  </span>
                  typing…
                </span>
              ) : isOtherOnline ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Last seen {formatLastSeen(other?.last_seen_at)}
                </>
              )}
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
                <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "justify-end opacity-80" : "text-muted-foreground"}`}>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && (
                    m.read_at ? (
                      <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Seen" />
                    ) : (
                      <Check className="h-3.5 w-3.5 opacity-80" aria-label="Sent" />
                    )
                  )}
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

      {cooldownUntil && cooldownUntil > now && (
        <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Rate limit — နောက် <strong>{Math.max(0, Math.ceil((cooldownUntil - now) / 1000))}s</strong> ကြာရင် point ထပ်ရနိုင်ပါမည်။
          </span>
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
        ) : friendStatus !== "accepted" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-2">
            <p className="text-xs text-muted-foreground text-center">
              {friendStatus === "pending_out"
                ? "Friend request ပို့ပြီးပြီ။ တစ်ဖက်က လက်ခံမှ စကားပြောလို့ ရပါမည်။"
                : friendStatus === "pending_in"
                ? "Friend request တောင်းခံထားသည်။ Accept လုပ်ပြီးမှ စကားပြောလို့ ရပါမည်။"
                : "Friend request ပို့ပြီးမှ စကားပြောလို့ ရပါမည်။"}
            </p>
            {friendStatus === "none" && other && (
              <Button
                size="sm"
                className="rounded-full"
                disabled={requestingFriend}
                onClick={async () => {
                  if (!user || !other) return;
                  setRequestingFriend(true);
                  const { error } = await sendFriendRequest(user.id, other.id);
                  setRequestingFriend(false);
                  if (error) {
                    toast({ title: "Failed", description: error.message, variant: "destructive" });
                  } else {
                    setFriendStatus("pending_out");
                    toast({ title: "Friend request sent" });
                  }
                }}
              >
                <UserPlus className="h-4 w-4 mr-1" /> Send friend request
              </Button>
            )}
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
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value.trim()) broadcastTyping();
              }}
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
