import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMlbbEvents } from "@/hooks/useMlbbEvents";
import { eventStatus, type MlbbEvent } from "@/lib/mlbbEvents";
import MlbbEventCard from "./MlbbEventCard";

/** Home-page MLBB events: compact slider on phones, 4-card row on desktop. */
const MlbbEventsSection = ({ variant }: { variant: "mobile" | "desktop" }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useMlbbEvents();
  const events = (data ?? []).filter((e) => eventStatus(e) !== "ended").slice(0, variant === "mobile" ? 8 : 4);
  const openDetails = (e: MlbbEvent) => navigate(`/mlbb-events?event=${e.id}`);
  const desktop = variant === "desktop";

  const seeAll = (
    <button
      onClick={() => navigate("/mlbb-events")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 font-semibold text-primary hover:bg-primary/10 transition",
        desktop ? "h-10 px-5 text-sm" : "h-8 px-3 text-xs",
      )}
    >
      See All <ChevronRight className={desktop ? "h-4 w-4" : "h-3.5 w-3.5"} />
    </button>
  );

  const body = isLoading ? (
    <div className={desktop ? "grid grid-cols-4 gap-5" : "flex gap-3 overflow-hidden"}>
      {Array.from({ length: desktop ? 4 : 2 }).map((_, i) => (
        <div key={i} className={cn("overflow-hidden rounded-2xl border border-border bg-card", !desktop && "w-[78%] shrink-0")}>
          <div className="aspect-[16/8] animate-pulse bg-muted" />
          <div className="space-y-2 p-3"><div className="h-3 animate-pulse rounded bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded bg-muted" /></div>
        </div>
      ))}
    </div>
  ) : isError ? (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-xs text-muted-foreground">Couldn't load MLBB events.</p>
      <button onClick={() => refetch()} className="mt-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Try again</button>
    </div>
  ) : events.length === 0 ? (
    <button onClick={() => navigate("/mlbb-events")} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><CalendarClock className="h-5 w-5 text-primary" /></span>
      <span>
        <span className="block text-sm font-bold">No upcoming MLBB events right now</span>
        <span className="block text-xs text-muted-foreground">New events appear here once announced.</span>
      </span>
    </button>
  ) : desktop ? (
    <div className="grid grid-cols-4 gap-5">
      {events.map((e) => <MlbbEventCard key={e.id} event={e} onDetails={openDetails} />)}
    </div>
  ) : (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
      {events.map((e) => <MlbbEventCard key={e.id} event={e} onDetails={openDetails} compact className="w-[78%] max-w-[300px] shrink-0 snap-start" />)}
    </div>
  );

  if (desktop) {
    return (
      <section className="mx-auto mt-12 max-w-7xl px-8" aria-label="MLBB Events">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-9 w-1.5 rounded-full bg-primary" />
            <div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight">MLBB Events</h2>
              <p className="text-sm text-muted-foreground">Upcoming skins, passes, diamond & esports events — Myanmar time</p>
            </div>
          </div>
          {seeAll}
        </div>
        {body}
      </section>
    );
  }
  return (
    <section className="px-5 pb-4" aria-label="MLBB Events">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-1 rounded-full bg-primary" />
          <div>
            <h2 className="text-base font-display font-bold tracking-tight">MLBB Events</h2>
            <p className="-mt-0.5 text-[11px] text-muted-foreground">Upcoming & live — Myanmar time</p>
          </div>
        </div>
        {seeAll}
      </div>
      {body}
    </section>
  );
};

export default MlbbEventsSection;
