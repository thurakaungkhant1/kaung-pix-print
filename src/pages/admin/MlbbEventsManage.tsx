import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  ArrowLeft, CalendarClock, CheckCircle2, EyeOff, ExternalLink, ImagePlus, Loader2, Pencil, Plus, RefreshCw, Trash2, AlertTriangle, History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  categoryLabel, EVENT_CATEGORIES, eventStatus, formatRange, formatYangonDateTime, fromYangonInput, toYangonInput, type MlbbEvent,
} from "@/lib/mlbbEvents";
import { StatusBadge, VerificationBadge } from "@/components/mlbb/MlbbEventCard";

type SyncRun = {
  id: string; trigger: string; status: string; started_at: string; finished_at: string | null;
  articles_checked: number; articles_analyzed: number; events_found: number; inserted: number; updated: number; unchanged: number;
  sources: Array<{ name: string; url: string; ok: boolean; articles: number; error?: string }>; errors: string[];
};

type Form = {
  id?: string; title: string; category: string; description: string; starts: string; ends: string;
  verification: "verified" | "tentative"; review_status: "pending" | "approved" | "hidden";
  source_name: string; source_url: string; image_url: string; image_permitted: boolean; show_topup: boolean;
};
const EMPTY: Form = {
  title: "", category: "special", description: "", starts: "", ends: "", verification: "tentative", review_status: "pending",
  source_name: "", source_url: "", image_url: "", image_permitted: false, show_topup: true,
};
const toForm = (e: MlbbEvent): Form => ({
  id: e.id, title: e.title, category: e.category, description: e.description ?? "", starts: toYangonInput(e.starts_at), ends: toYangonInput(e.ends_at),
  verification: e.verification, review_status: e.review_status, source_name: e.source_name ?? "", source_url: e.source_url ?? "",
  image_url: e.image_url ?? "", image_permitted: e.image_permitted, show_topup: e.show_topup,
});

const FILTERS = [
  { key: "review", label: "Needs review" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
] as const;

const MlbbEventsManage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<MlbbEvent[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("review");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toDelete, setToDelete] = useState<MlbbEvent | null>(null);

  const load = async () => {
    setLoading(true);
    const [ev, rn] = await Promise.all([
      supabase.from("mlbb_events").select("*").order("starts_at", { ascending: true, nullsFirst: false }).limit(500),
      supabase.from("mlbb_event_sync_runs").select("*").order("started_at", { ascending: false }).limit(30),
    ]);
    if (ev.error) toast.error(`Couldn't load events: ${ev.error.message}`);
    setEvents((ev.data ?? []) as unknown as MlbbEvent[]);
    setRuns((rn.data ?? []) as unknown as SyncRun[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => events.filter((e) =>
    filter === "all" ? true
      : filter === "review" ? e.review_status === "pending" || e.needs_review
      : e.review_status === filter), [events, filter]);
  const reviewCount = events.filter((e) => e.review_status === "pending" || e.needs_review).length;
  const lastOk = runs.find((r) => r.status === "success" || r.status === "partial");

  const patch = async (e: MlbbEvent, changes: Partial<MlbbEvent>, msg: string) => {
    const { error } = await supabase.from("mlbb_events").update(changes).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    load();
  };

  const save = async () => {
    if (!form) return;
    const title = form.title.trim();
    if (!title) return toast.error("Event name is required");
    const starts_at = fromYangonInput(form.starts);
    const ends_at = fromYangonInput(form.ends);
    if (starts_at && ends_at && Date.parse(ends_at) < Date.parse(starts_at)) return toast.error("End must be after start");
    if (form.verification === "verified" && !form.source_url.trim()) return toast.error("A verified event needs its official source link");
    if (form.source_url && !/^https?:\/\//i.test(form.source_url.trim())) return toast.error("Source link must start with https://");
    setSaving(true);
    const payload = {
      title, category: form.category, description: form.description.trim() || null, starts_at, ends_at,
      verification: form.verification, review_status: form.review_status,
      source_name: form.source_name.trim() || null, source_url: form.source_url.trim() || null,
      image_url: form.image_url || null, image_permitted: form.image_permitted, show_topup: form.show_topup,
      needs_review: false,
    };
    const { data: auth } = await supabase.auth.getUser();
    const { error } = form.id
      ? await supabase.from("mlbb_events").update(payload).eq("id", form.id)
      : await supabase.from("mlbb_events").insert({ ...payload, origin: "manual", created_by: auth.user?.id ?? null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Event updated" : "Event added");
    setForm(null);
    load();
  };

  const upload = async (file: File) => {
    if (!form) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `mlbb-events/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("operator-logos").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return toast.error(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from("operator-logos").getPublicUrl(path);
    setForm({ ...form, image_url: data.publicUrl });
  };

  const runSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("mlbb-events-sync", { body: { trigger: "manual" } });
    setSyncing(false);
    if (error) {
      let details = error.message;
      if (error instanceof FunctionsHttpError) {
        try { details = (await error.context.json()).error ?? details; } catch { /* keep message */ }
      }
      toast.error(`Sync failed: ${details}`);
    } else {
      toast.success(`Sync ${data.status}: ${data.inserted} new, ${data.updated} changed, ${data.unchanged} unchanged`);
    }
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("mlbb_events").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-nav px-4 py-3 text-nav-foreground shadow lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-nav-foreground hover:bg-nav-foreground/10"><ArrowLeft /></Button>
          <CalendarClock className="h-5 w-5" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">MLBB Events</h1>
            <p className="truncate text-xs text-nav-muted">
              {lastOk?.finished_at ? `Last successful sync ${formatYangonDateTime(lastOk.finished_at)}` : "No successful sync yet"} · daily at 07:00 MMT
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />} Sync now
          </Button>
          <Button size="sm" onClick={() => setForm({ ...EMPTY })} className="bg-highlight text-highlight-foreground hover:bg-highlight/90"><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          The daily sync reads official <b>MLBB Esports</b> and <b>MOONTON</b> announcements and only keeps dates quoted word-for-word from them.
          Found events arrive here as <b>Pending + Tentative</b> — nothing is shown to customers until you approve it.
          In-game events (skins, Starlight, diamond, recharge) are not published in any open official feed, so add those by hand.
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events {reviewCount > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{reviewCount}</span>}</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-1 h-3.5 w-3.5" /> Sync history</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn("h-8 shrink-0 rounded-full border px-3 text-xs font-semibold", filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
                  {f.label}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : shown.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No events in this list.</p>
            ) : (
              <div className="space-y-3">
                {shown.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={eventStatus(e)} />
                      <VerificationBadge verification={e.verification} />
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        e.review_status === "approved" ? "bg-primary/10 text-primary" : e.review_status === "hidden" ? "bg-muted text-muted-foreground" : "bg-highlight/20 text-foreground")}>
                        {e.review_status}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{e.origin === "sync" ? "Auto-found" : "Manual"}</span>
                      {e.needs_review && e.review_status !== "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><AlertTriangle className="h-3 w-3" /> Source changed — re-check</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-bold">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">{categoryLabel(e.category)} · {formatRange(e)} (MMT)</p>
                    {e.evidence && <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs italic">“{e.evidence}”</p>}
                    {e.source_url && (
                      <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        {e.source_name || "Source"} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(e.review_status !== "approved" || e.needs_review) && (
                        <Button size="sm" onClick={() => patch(e, { review_status: "approved", needs_review: false }, "Approved — now visible to customers")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                      )}
                      {e.verification === "tentative" && e.source_url && (
                        <Button size="sm" variant="outline" onClick={() => patch(e, { verification: "verified", needs_review: false }, "Marked as Verified")}>Mark verified</Button>
                      )}
                      {e.review_status !== "hidden" && (
                        <Button size="sm" variant="outline" onClick={() => patch(e, { review_status: "hidden", needs_review: false }, "Hidden from customers")}><EyeOff className="mr-1 h-4 w-4" /> Hide</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setForm(toForm(e))}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(e)}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {runs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No sync has run yet.</p>
            ) : runs.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    r.status === "success" ? "bg-primary/10 text-primary" : r.status === "error" ? "bg-destructive/10 text-destructive" : "bg-highlight/20")}>{r.status}</span>
                  <span className="font-semibold">{formatYangonDateTime(r.started_at)}</span>
                  <span className="text-xs text-muted-foreground">{r.trigger === "manual" ? "Started by admin" : "Daily schedule"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.articles_checked} articles checked · {r.articles_analyzed} read for dates · {r.events_found} events found · {r.inserted} new · {r.updated} changed · {r.unchanged} unchanged
                </p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {(r.sources ?? []).map((s) => (
                    <li key={s.url} className={s.ok ? "text-foreground" : "text-destructive"}>
                      {s.ok ? "✓" : "✕"} {s.name} — {s.ok ? `${s.articles} articles listed` : s.error}
                    </li>
                  ))}
                </ul>
                {(r.errors ?? []).length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-destructive">{r.errors.length} error(s)</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">{r.errors.map((x, i) => <li key={i} className="break-all">{x}</li>)}</ul>
                  </details>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Edit event" : "Add event"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Event name</Label><Input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea rows={3} maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[200px] flex-1"><Label>Starts (Myanmar time)</Label><Input type="datetime-local" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /></div>
                <div className="min-w-[200px] flex-1"><Label>Ends (Myanmar time)</Label><Input type="datetime-local" value={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.value })} /></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[200px] flex-1">
                  <Label>Verification</Label>
                  <Select value={form.verification} onValueChange={(v) => setForm({ ...form, verification: v as Form["verification"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tentative">Tentative (not confirmed)</SelectItem>
                      <SelectItem value="verified">Verified (official source)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[200px] flex-1">
                  <Label>Visibility</Label>
                  <Select value={form.review_status} onValueChange={(v) => setForm({ ...form, review_status: v as Form["review_status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending (hidden)</SelectItem>
                      <SelectItem value="approved">Approved (visible)</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Source name</Label><Input placeholder="e.g. MLBB official Facebook" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} /></div>
              <div><Label>Source link</Label><Input type="url" placeholder="https://" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} /></div>
              <div className="space-y-2 rounded-xl border border-border p-3">
                <Label>Event artwork</Label>
                {form.image_url && <img src={form.image_url} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />}
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline" disabled={uploading}>
                    <label className="cursor-pointer">
                      {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />} Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                    </label>
                  </Button>
                  {form.image_url && <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, image_url: "" })}>Remove</Button>}
                </div>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>I have permission to show this artwork</span>
                  <Switch checked={form.image_permitted} onCheckedChange={(v) => setForm({ ...form, image_permitted: v })} />
                </label>
                <p className="text-[11px] text-muted-foreground">Without permission, customers see a branded placeholder instead.</p>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Show “Top Up Diamonds” button</span>
                <Switch checked={form.show_topup} onCheckedChange={(v) => setForm({ ...form, show_topup: v })} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete?.title}” will be removed permanently. If the daily sync finds it again it returns as Pending — use Hide to keep it away for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MlbbEventsManage;
