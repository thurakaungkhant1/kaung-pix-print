import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Sparkles, Loader2, Lock, Download, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";

interface Style { name: string; description: string; background: string; text_color: string; accent_color: string; }
interface Invitation { id: string; invitation_text: string; theme: string; styles: Style[]; selected_style_index: number | null; price_mmk: number; status: string; paid: boolean; created_at: string; }

const themes = ["classic", "royal", "modern", "floral", "minimal", "tropical"];

const AIInvitation = () => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [theme, setTheme] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [active, setActive] = useState<Invitation | null>(null);
  const [price, setPrice] = useState(1000);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("ai_usage_settings").select("invitation_price_mmk").limit(1).maybeSingle();
      if (s) setPrice(Number(s.invitation_price_mmk));
      const { data } = await supabase.from("ai_invitations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setInvitations((data ?? []) as any);
    })();
  }, [user]);

  const generate = async () => {
    if (text.trim().length < 10) { toast.error("Write at least 10 characters"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-invitation", {
        body: { invitation_text: text.trim(), theme },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setActive(data.invitation);
      setInvitations((p) => [data.invitation, ...p]);
      setText("");
      toast.success("Styles generated! Pick a favorite then request approval.");
    } catch (e: any) { toast.error(e.message ?? "Generation failed"); }
    finally { setLoading(false); }
  };

  const selectStyle = async (inv: Invitation, idx: number) => {
    const { error } = await supabase.from("ai_invitations").update({ selected_style_index: idx }).eq("id", inv.id);
    if (error) { toast.error(error.message); return; }
    const updated = { ...inv, selected_style_index: idx };
    setActive(updated);
    setInvitations((p) => p.map((i) => i.id === inv.id ? updated : i));
    toast.success("Style selected");
  };

  const isUnlocked = (inv: Invitation) => inv.paid && inv.status === "approved";

  const downloadInvitation = (inv: Invitation) => {
    if (!isUnlocked(inv)) { toast.error("Locked. Pay & wait for admin approval."); return; }
    const idx = inv.selected_style_index ?? 0;
    const style = inv.styles[idx];
    if (!style) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invitation</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;background:${style.background};color:${style.text_color};padding:2rem;text-align:center;">
<div style="max-width:540px;background:rgba(255,255,255,.08);backdrop-filter:blur(10px);padding:3rem 2rem;border-radius:24px;border:1px solid ${style.accent_color}55">
<h1 style="margin:0 0 1rem;font-size:2rem;color:${style.accent_color}">${style.name}</h1>
<div style="white-space:pre-wrap;line-height:1.7">${inv.invitation_text.replace(/</g, "&lt;")}</div>
</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invitation-${inv.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -left-20 w-96 h-96 rounded-full bg-pink-500/15 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} />
      </div>
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent transition"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold flex-1">Wedding Invitation</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 font-medium">{price.toLocaleString()} MMK</span>
        </div>
      </header>

      <div className="relative z-10 px-4 py-5 max-w-md mx-auto space-y-5">
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl">
          <label className="text-sm font-medium mb-2 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Invitation text</label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000} placeholder="Hayman & Su Su cordially invite you to their wedding on..." />
          <p className="text-xs text-muted-foreground mt-1 text-right">{text.length}/2000</p>

          <label className="text-sm font-medium mb-2 mt-3 block">Theme</label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{themes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
          </Select>

          <Button onClick={generate} disabled={loading || text.trim().length < 10} className="w-full mt-4 h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-white font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98]">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Generate Styles</>)}
          </Button>
        </motion.div>

        <AnimatePresence>
          {active && active.styles?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Pick a style</h2>
              <div className="space-y-3">
                {active.styles.map((s, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => selectStyle(active, i)} className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all ${active.selected_style_index === i ? "border-primary shadow-lg" : "border-border/50"}`}>
                    <div style={{ background: s.background, color: s.text_color }} className="p-5">
                      <div className="text-lg font-bold" style={{ color: s.accent_color }}>{s.name}</div>
                      <div className="text-xs opacity-90 mt-1">{s.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="rounded-2xl p-4 bg-card/60 backdrop-blur-xl border border-border/50 flex items-center gap-3">
                {isUnlocked(active) ? (
                  <Button onClick={() => downloadInvitation(active)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                    <Download className="w-4 h-4 mr-2" /> Download Invitation
                  </Button>
                ) : (
                  <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" /> Locked — pay {price.toLocaleString()} MMK to admin & wait for approval to download.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {invitations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Your Invitations</h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <motion.div key={inv.id} layout className="rounded-xl p-3 bg-card/60 backdrop-blur border border-border/40 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inv.status === "approved" && inv.paid ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {inv.status === "approved" && inv.paid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate capitalize">{inv.theme} · {inv.status}{inv.paid ? "" : " · unpaid"}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.invitation_text.slice(0, 60)}…</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setActive(inv)}>Open</Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
};

export default AIInvitation;
