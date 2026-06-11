import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Headphones, User as UserIcon, Search, Filter, X, Package, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  user_id: string;
  sender_role: "user" | "admin";
  body: string;
  created_at: string;
  order_id?: string | null;
}

interface ThreadInfo {
  user_id: string;
  name: string;
  email: string | null;
  last_body: string;
  last_at: string;
  unread: number;
}

const SupportManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [allMessages, setAllMessages] = useState<Record<string, Msg[]>>({});
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { status: string; product_name?: string }>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    const { data: msgs } = await (supabase as any)
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!msgs) return;
    const map = new Map<string, ThreadInfo>();
    for (const m of msgs as Msg[]) {
      const existing = map.get(m.user_id);
      if (!existing) {
        map.set(m.user_id, {
          user_id: m.user_id,
          name: "",
          email: null,
          last_body: m.body,
          last_at: m.created_at,
          unread: 0,
        });
      }
      const t = map.get(m.user_id)!;
      if (m.sender_role === "user" && !((m as any).is_read)) t.unread += 1;
    }
    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", ids);
      profs?.forEach((p: any) => {
        const t = map.get(p.id);
        if (t) {
          t.name = p.name || "User";
          t.email = p.email;
        }
      });
    }
    setThreads([...map.values()].sort((a, b) => +new Date(b.last_at) - +new Date(a.last_at)));

    const grouped: Record<string, Msg[]> = {};
    for (const m of msgs as Msg[]) {
      (grouped[m.user_id] ||= []).push(m);
    }
    setAllMessages(grouped);
  };

  useEffect(() => {
    loadThreads();
    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload: any) => {
        loadThreads();
        if (payload.new.user_id === activeUserId) {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    (supabase as any)
      .from("support_messages")
      .select("*")
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: true })
      .then(async ({ data }: any) => {
        const msgs = (data || []) as Msg[];
        setMessages(msgs);
        const ids = Array.from(new Set(msgs.map((m) => m.order_id).filter(Boolean))) as string[];
        if (ids.length) {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, status, product_id, products(name)")
            .in("id", ids);
          const map: Record<string, { status: string; product_name?: string }> = {};
          (orders || []).forEach((o: any) => {
            map[o.id] = { status: o.status, product_name: o.products?.name };
          });
          setOrderStatuses(map);
        } else {
          setOrderStatuses({});
        }
      });
    // mark user messages as read
    (supabase as any)
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", activeUserId)
      .eq("sender_role", "user")
      .then(() => loadThreads());
  }, [activeUserId]);

  const markOrderCompleted = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setOrderStatuses((prev) => ({ ...prev, [orderId]: { ...prev[orderId], status: "approved" } }));
    toast({ title: "Order marked completed ✅" });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!activeUserId || !input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const { error } = await (supabase as any).from("support_messages").insert({
      user_id: activeUserId,
      sender_role: "admin",
      body,
    });
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      setInput(body);
    }
    setSending(false);
  };

  const active = useMemo(() => threads.find((t) => t.user_id === activeUserId), [threads, activeUserId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-primary-foreground px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Headphones className="h-5 w-5" />
          <h1 className="text-base font-display font-bold">Support Inbox</h1>
        </div>
      </header>

      <div className="grid md:grid-cols-[320px_1fr] h-[calc(100vh-56px)]">
        {/* Threads list */}
        <aside className={cn("border-r border-border overflow-y-auto bg-card/40 flex flex-col", activeUserId && "hidden md:flex")}>
          <div className="p-3 border-b border-border space-y-2 sticky top-0 bg-card/80 backdrop-blur z-10">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or message…"
                className="pl-9 pr-9 h-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 text-xs font-semibold px-3 h-8 rounded-full border transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {f === "all" ? "All" : "Unread"}
                  {f === "unread" && (
                    <span className="ml-1 opacity-80">
                      ({threads.reduce((a, t) => a + (t.unread > 0 ? 1 : 0), 0)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const q = search.trim().toLowerCase();
            let list = threads;
            if (filter === "unread") list = list.filter((t) => t.unread > 0);
            if (q) {
              list = list.filter((t) => {
                if (
                  t.name?.toLowerCase().includes(q) ||
                  t.email?.toLowerCase().includes(q) ||
                  t.last_body?.toLowerCase().includes(q)
                )
                  return true;
                const msgs = allMessages[t.user_id] || [];
                return msgs.some((m) => m.body?.toLowerCase().includes(q));
              });
            }
            if (list.length === 0) {
              return (
                <p className="p-6 text-sm text-muted-foreground">
                  {threads.length === 0 ? "No conversations yet." : "No matches."}
                </p>
              );
            }
            return list.map((t) => (
              <button
                key={t.user_id}
                onClick={() => setActiveUserId(t.user_id)}
                className={cn(
                  "w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors flex gap-3 items-center",
                  activeUserId === t.user_id && "bg-muted"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{t.name || "User"}</p>
                    {t.unread > 0 && (
                      <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 font-bold">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.last_body}</p>
                </div>
              </button>
            ));
          })()}
        </aside>


        {/* Active conversation */}
        <section className={cn("flex flex-col", !activeUserId && "hidden md:flex")}>
          {!activeUserId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/40">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveUserId(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{active?.name || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{active?.email || "—"}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_role === "admin";
                  const ord = m.order_id ? orderStatuses[m.order_id] : null;
                  const completed = ord?.status === "approved" || ord?.status === "finished" || ord?.status === "completed";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border rounded-bl-md"
                        }`}
                      >
                        {m.order_id && (
                          <div className={`mb-2 flex flex-wrap items-center gap-2 pb-2 border-b ${mine ? "border-primary-foreground/20" : "border-border"}`}>
                            <Badge variant={completed ? "default" : "secondary"} className="gap-1 text-[10px]">
                              <Package className="h-3 w-3" />
                              Order #{m.order_id.slice(0, 8).toUpperCase()}
                            </Badge>
                            <Badge variant={completed ? "default" : "outline"} className="text-[10px]">
                              {completed ? "Completed" : "Pending Admin Info"}
                            </Badge>
                            {ord?.product_name && (
                              <span className={`text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                                {ord.product_name}
                              </span>
                            )}
                            {!completed && !mine && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => markOrderCompleted(m.order_id!)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Mark Completed
                              </Button>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-border bg-background space-y-2">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    "မင်္ဂလာပါ 👋 အချက်အလက် လက်ခံရရှိပါပြီ။ စစ်ဆေးပေးနေပါတယ်။",
                    "Activation လုပ်ပေးပြီးပါပြီ ✅ ကျေးဇူးတင်ပါတယ်။",
                    "ပိုပြီးအချက်အလက် (Email / Username / Package) ပို့ပေးပါ။",
                    "Order ID အတည်ပြုပေးနိုင်ပါသလား?",
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => setInput((prev) => (prev ? prev + "\n" + tpl : tpl))}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 border border-border transition-colors"
                    >
                      {tpl.length > 32 ? tpl.slice(0, 32) + "…" : tpl}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Reply… (Ctrl/⌘ + Enter to send)"
                    rows={2}
                    className="flex-1 min-h-[44px] max-h-40 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                  />
                  <Button
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="h-11 rounded-full px-4 gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SupportManage;
