import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gift, Sparkles, Loader2, Upload, X, Copy, Lock, Clock, CheckCircle2, QrCode, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";

import GiftCardPreview, { GIFT_STYLES as STYLES } from "@/components/GiftCardPreview";

interface GiftLink { id: string; slug: string; status: string; payload: any; created_at: string; }

const AIGift = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<GiftLink[]>([]);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("ai_gift_links").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setLinks((data ?? []) as any);
    })();
  }, [user]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setImageFile(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const create = async () => {
    if (!user) return;
    if (!message.trim() && !imageFile) { toast.error("Add a message or image"); return; }
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const path = `${user.id}/gift-${Date.now()}.${imageFile.name.split(".").pop() || "png"}`;
        const { error: upErr } = await supabase.storage.from("ai-uploads").upload(path, imageFile, { contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("ai-uploads").createSignedUrl(path, 60 * 60 * 24 * 30);
        imageUrl = signed?.signedUrl;
      }
      const { data, error } = await supabase.functions.invoke("ai-create-gift-link", {
        body: { message: message.trim(), image_url: imageUrl, style_index: styleIdx },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLinks((p) => [data.link, ...p]);
      toast.success("Gift link created — ready to share!");
      setMessage(""); setImageFile(null); setImagePreview(null);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  const buildShareUrl = (slug: string) => {
    const origin = window.location.origin;
    // Preview / sandbox URLs aren't accessible to other people — use the published domain.
    const isPrivateOrigin = /id-preview--|lovableproject\.com|localhost|127\.0\.0\.1/.test(origin);
    const publicOrigin = isPrivateOrigin ? "https://kaung-pix-print.lovable.app" : origin;
    return `${publicOrigin}/g/${slug}`;
  };

  const copyLink = (slug: string) => {
    const url = buildShareUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const openQr = async (slug: string) => {
    const url = buildShareUrl(slug);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrSlug(slug);
      setQrDataUrl(dataUrl);
    } catch (e: any) {
      toast.error("Couldn't generate QR code");
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrSlug) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `gift-${qrSlug}.png`;
    a.click();
  };

  const shareQr = async () => {
    if (!qrDataUrl || !qrSlug) return;
    const url = buildShareUrl(qrSlug);
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], `gift-${qrSlug}.png`, { type: "image/png" });
      // @ts-ignore
      if (navigator.canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], url, title: "A gift for you 💝" });
        return;
      }
      if (navigator.share) {
        await navigator.share({ url, title: "A gift for you 💝" });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {}
  };

  const style = STYLES[styleIdx];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent transition"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-semibold flex-1">Gift Link Creator</h1>
        </div>
      </header>

      <div className="relative z-10 px-4 py-5 max-w-md mx-auto space-y-5">
        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl overflow-hidden border border-border/50 shadow-xl">
          <GiftCardPreview style={style} message={message} imageUrl={imagePreview} variant="preview" />
        </motion.div>

        <div className="grid grid-cols-5 gap-2">
          {STYLES.map((s, i) => (
            <motion.button key={i} whileTap={{ scale: 0.92 }} onClick={() => setStyleIdx(i)} className={`aspect-square rounded-lg border-2 transition ${styleIdx === i ? "border-primary scale-105" : "border-transparent"}`} style={{ background: s.bg }} aria-label={s.name} />
          ))}
        </div>

        <div className="rounded-2xl p-4 bg-card/60 backdrop-blur-xl border border-border/50 space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Image (optional)</label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={imagePreview} alt="" className="w-full h-32 object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground transition">
                <Upload className="w-5 h-5" /><span className="text-xs">Tap to upload</span>
              </button>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} placeholder="A little something just for you 💝" />
          </div>
          <Button onClick={create} disabled={loading || (!message.trim() && !imageFile)} className="w-full h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]">
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>) : (<><Sparkles className="w-4 h-4 mr-2" /> Create Gift Link</>)}
          </Button>
        </div>

        <AnimatePresence>
          {links.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-sm font-semibold mb-3">Your Gift Links</h2>
              <div className="space-y-2">
                {links.map((l) => (
                  <motion.div key={l.id} layout className="rounded-xl p-3 bg-card/60 backdrop-blur border border-border/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono truncate">/g/{l.slug}</div>
                      <div className="text-xs text-muted-foreground">Ready to share</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openQr(l.slug)} aria-label="Show QR code">
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(l.slug)} aria-label="Copy link">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={!!qrSlug} onOpenChange={(o) => { if (!o) { setQrSlug(null); setQrDataUrl(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to open gift</DialogTitle>
            <DialogDescription className="text-xs break-all">
              {qrSlug ? buildShareUrl(qrSlug) : ""}
            </DialogDescription>
          </DialogHeader>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-white shadow-lg">
                <img src={qrDataUrl} alt="Gift link QR code" className="w-56 h-56" />
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" onClick={downloadQr}>
                  <Download className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button onClick={shareQr} className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Anyone scanning this code will open your gift card.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </motion.div>
  );
};

export default AIGift;
