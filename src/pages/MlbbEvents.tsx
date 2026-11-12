import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Gem, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import { useMlbbEvents, useMlbbLastSync } from "@/hooks/useMlbbEvents";
import { EVENT_CATEGORIES, eventStatus, formatYangonDateTime, MLBB_TOPUP_ROUTE, type EventStatus, type MlbbEvent } from "@/lib/mlbbEvents";
import MlbbEventCard from "@/components/mlbb/MlbbEventCard";
import MlbbEventDialog from "@/components/mlbb/MlbbEventDialog";

const STATUS_TABS: Array<{ key: "active" | EventStatus; label: string }> = [
  { key: "active", label: "Live & Upcoming" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Ended" },
];

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40",
    )}
  >
    {children}
  </button>
);

const MlbbEvents = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useMlbbEvents();
  const { data: lastSync } = useMlbbLastSync();
  const [tab, setTab] = useState<"active" | EventStatus>("active");
  const [cat, setCat] = useState<string>("all");

  const all = data ?? [];
  const list = useMemo(
    () => all.filter((e) => {
      const s = eventStatus(e);
      if (tab === "active" ? s === "ended" : s !== tab) return false;
      return cat === "all" || e.category === cat;
    }),
    [all, tab, cat],
  );
  const selectedId = params.get("event");
  const selected = all.find((e) => e.id === selectedId) ?? null;
  const open = (e: MlbbEvent) => setParams((p) => { p.set("event", e.id); return p; }, { replace: true });
  const close = () => setParams((p) => { p.delete("event"); return p; }, { replace: true });

  return (
    <MobileLayout className="bg-background">
      <div className="mx-auto max-w-7xl pb-28 lg:pb-10">
        <header className="relative overflow-hidden bg-nav px-5 pb-6 pt-5 text-nav-foreground lg:mx-8 lg:mt-8 lg:rounded-3xl lg:px-10 lg:py-10">
          <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-primary)" }} />
          <div className="relative">
            <button onClick={() => navigate(-1)} aria-label="Back" className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-nav-foreground/15 lg:hidden">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-nav-muted">Mobile Legends: Bang Bang</p>
            <h1 className="mt-1 font-display text-2xl font-black tracking-tight lg:text-4xl">MLBB Events Center</h1>
            <p className="mt-1 max-w-xl text-xs text-nav-muted lg:text-sm">Upcoming skins, Starlight, diamond, recharge, collaboration and esports events. All times are Myanmar time.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => navigate(MLBB_TOPUP_ROUTE)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-highlight px-5 text-sm font-bold text-highlight-foreground">
                <Gem className="h-4 w-4" /> Top Up Diamonds
              </button>
              {lastSync && <span className="text-[11px] text-nav-muted">Official sources last checked {formatYangonDateTime(lastSync)}</span>}
            </div>
          </div>
        </header>

        <div className="space-y-3 px-5 pt-4 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map((t) => <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</Chip>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>All types</Chip>
            {EVENT_CATEGORIES.map((c) => <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</Chip>)}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified = confirmed by an official announcement</span>
            <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Tentative = not officially confirmed, may change</span>
          </p>
        </div>

        <div className="px-5 pt-4 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load MLBB events.</p>
              <button onClick={() => refetch()} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <CalendarClock className="h-10 w-10 text-primary" />
              <p className="mt-3 text-sm font-bold">No events here yet</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">We only list events with dates from official MLBB/MOONTON announcements. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {list.map((e) => <MlbbEventCard key={e.id} event={e} onDetails={open} />)}
            </div>
          )}
        </div>
      </div>
      <MlbbEventDialog event={selected} onClose={close} />
    </MobileLayout>
  );
};

export default MlbbEvents;
