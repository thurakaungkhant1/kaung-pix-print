import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useMlbbEvents } from "@/hooks/useMlbbEvents";
import { eventStatus, formatRange } from "@/lib/mlbbEvents";

/** Small link from the Mobile Legends top-up page to the MLBB Events Center. */
const MlbbEventsEntry = () => {
  const navigate = useNavigate();
  const { data } = useMlbbEvents();
  const active = (data ?? []).filter((e) => eventStatus(e) !== "ended");
  const next = active[0];
  return (
    <button
      type="button"
      onClick={() => navigate("/mlbb-events")}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CalendarClock className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">MLBB Events</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {next ? `${active.length} live & upcoming · Next: ${next.title} (${formatRange(next)})` : "Upcoming skins, Starlight & diamond events"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-primary" />
    </button>
  );
};

export default MlbbEventsEntry;
