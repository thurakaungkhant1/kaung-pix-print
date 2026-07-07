import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Smile,
  MoreVertical,
  Ban,
  UserPlus,
  Check,
  CheckCheck,
  Phone,
  Plus,
  Image as ImageIcon,
  Mic,
  Clock,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import ChatSettingsDialog from "@/components/ChatSettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { usePresenceMap, formatLastSeenExact } from "@/hooks/usePresence";
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
  last_seen_privacy?: string | null;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "❤️", "😢", "😎", "🤔", "👏"];

const formatDayLabel = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startToday - startD) / 86_400_000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).toUpperCase();
};

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const otherTypingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOtherOnline = !!other && (
    online.has(other.id) ||
    (!!other.last_seen_at && Date.now() - new Date(other.last_seen_at).getTime() < 90_000)
  );

  // Whether we can show "last seen ..." at all (respect privacy setting).
  // If `last_seen_at` came back as null from the view, the DB already masked it.
  const canShowLastSeen = !!other?.last_seen_at;

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
          .select("id, name, avatar_url, last_seen_at, last_seen_privacy")
          .eq("id", otherId)
          .maybeSingle();
        setOther((prof as any) ?? null);

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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
      const result = await awardChatPoints(user.id, body);
      if (result.amount > 0) {
        toast({ title: `+${result.amount} coin`, description: "Chat reward earned" });
        setCooldownUntil(null);
      } else if (result.reason === "cooldown" && result.cooldownRemaining) {
        setCooldownUntil(Date.now() + result.cooldownRemaining * 1000);
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

  // Precompute which message ends each visual "group" (last of same sender within 60s)
  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const sameAsPrev = prev && prev.sender_id === m.sender_id &&
        new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000;
      const sameAsNext = next && next.sender_id === m.sender_id &&
        new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < 60_000;
      const showDayHeader = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
      return { m, sameAsPrev, sameAsNext, showDayHeader };
    });
  }, [messages]);

  const statusText = iBlockedThem
    ? "Blocked"
    : theyBlockedMe
    ? "Unavailable"
    : otherTyping
    ? "typing…"
    : isOtherOnline
    ? "online"
    : canShowLastSeen
    ? formatLastSeenExact(other?.last_seen_at)
    : "last seen recently";

  return (
    <MobileLayout className="flex flex-col bg-[hsl(var(--chat-bg,210_20%_98%))]">
      {/* Header - clean, light */}
      <header className="bg-card border-b border-border/60 px-3 py-2.5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="p-2 -ml-1 rounded-full hover:bg-muted/70 text-foreground/70"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => other && navigate(`/user/${other.id}`)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={other?.avatar_url ?? undefined} />
                <AvatarFallback className="text-sm">
                  {other?.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {isOtherOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold leading-tight truncate text-foreground">
                {other?.name || "Chat"}
              </h1>
              <p className={`text-[11px] leading-tight truncate ${
                isOtherOnline ? "text-emerald-600 dark:text-emerald-400" :
                otherTyping ? "text-primary" : "text-muted-foreground"
              }`}>
                {statusText}
              </p>
            </div>
          </button>

          <button
            className="p-2 rounded-full hover:bg-muted/70 text-primary"
            aria-label="Call"
            onClick={() => toast({ title: "Voice call coming soon" })}
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 -mr-1 rounded-full hover:bg-muted/70 text-foreground/70"
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {messages.length === 0 && (
          <div className="text-center py-24 px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Smile className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-1">Say hi 👋</h3>
            <p className="text-sm text-muted-foreground">
              {other?.name ? `Start chatting with ${other.name}` : "Start the conversation."}
            </p>
          </div>
        )}

        {grouped.map(({ m, sameAsPrev, sameAsNext, showDayHeader }) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id}>
              {showDayHeader && (
                <div className="flex justify-center my-4">
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                    {formatDayLabel(m.created_at)} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-0.5" : "mt-2"}`}>
                {/* Avatar on left for their messages, only at end of group */}
                {!mine && (
                  <div className="w-7 flex-shrink-0">
                    {!sameAsNext && (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={other?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {other?.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] px-3.5 py-2 text-[14px] leading-snug break-words shadow-sm ${
                    mine
                      ? `bg-primary text-primary-foreground rounded-2xl ${sameAsNext ? "rounded-br-2xl" : "rounded-br-md"}`
                      : `bg-card text-card-foreground border border-border/50 rounded-2xl ${sameAsNext ? "rounded-bl-2xl" : "rounded-bl-md"}`
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {!sameAsNext && (
                    <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${mine ? "justify-end text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      {mine && (
                        m.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-sky-200" aria-label="Seen" />
                        ) : (
                          <Check className="h-3.5 w-3.5 opacity-80" aria-label="Sent" />
                        )
                      )}
                    </p>
                  )}
                </div>

                {mine && (
                  <div className="w-7 flex-shrink-0">
                    {!sameAsNext && (
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {user?.email?.charAt(0)?.toUpperCase() || "M"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {otherTyping && (
          <div className="flex items-end gap-1.5 justify-start mt-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={other?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {other?.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {showEmoji && (
        <div className="px-3 pb-2 border-t bg-card">
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
            နောက် <strong>{Math.max(0, Math.ceil((cooldownUntil - now) / 1000))}s</strong> ကြာရင် point ထပ်ရနိုင်ပါမည်။
          </span>
        </div>
      )}

      {/* Composer */}
      <div className="px-2.5 py-2 border-t border-border/60 bg-card sticky bottom-0">
        {(iBlockedThem || theyBlockedMe) ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3">
            <Ban className="h-4 w-4" />
            {iBlockedThem ? "You blocked this user." : "This user has blocked you."}
          </div>
        ) : friendStatus !== "accepted" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-3 px-2">
            <p className="text-xs text-muted-foreground text-center">
              {friendStatus === "pending_out"
                ? "Friend request sent. Waiting for accept."
                : friendStatus === "pending_in"
                ? "Accept the friend request to chat."
                : "Send a friend request to start chatting."}
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
                  if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
                  else {
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
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-primary hover:bg-primary/10"
              onClick={() => toast({ title: "Attachments coming soon" })}
              aria-label="Attach"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-primary hover:bg-primary/10"
              onClick={() => toast({ title: "Photo upload coming soon" })}
              aria-label="Photo"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-primary hover:bg-primary/10"
              onClick={() => setShowEmoji((v) => !v)}
              aria-label="Emoji"
            >
              <Smile className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value.trim()) broadcastTyping();
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="write your message..."
                maxLength={2000}
                className="w-full resize-none rounded-full bg-muted/60 border border-border/60 px-4 py-2.5 text-[14px] leading-snug focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/70 max-h-[120px]"
              />
            </div>

            {input.trim() ? (
              <button
                onClick={send}
                disabled={sending}
                className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-primary hover:bg-primary/10"
                onClick={() => toast({ title: "Voice messages coming soon" })}
                aria-label="Record"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ChatThread;
