import { useEffect, useState } from "react";
import { Clock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCountdownProps {
  /** ISO timestamp when the event ends */
  endsAt: string;
  /** Optional label shown before the timer, e.g. "EVENT" */
  label?: string | null;
  className?: string;
  /** Use the Clash of Clans display font */
  coc?: boolean;
  /** Visual layout: compact badge (default), prominent top-of-card banner, or floating COC corner clock */
  variant?: "badge" | "banner" | "corner";
}

const pad = (n: number) => String(n).padStart(2, "0");

const format = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};

const formatShort = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}H`;
  if (hours > 0) return `${hours}H ${pad(mins)}M`;
  return `${mins}M ${pad(secs)}S`;
};

/** Live countdown badge for limited-time product events. Hides itself once expired. */
export const EventCountdown = ({
  endsAt,
  label,
  className,
  coc,
  variant = "badge",
}: EventCountdownProps) => {
  const target = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    setRemaining(target - Date.now());
    const id = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || Number.isNaN(target) || remaining <= 0) return null;

  const urgent = remaining < 60 * 60 * 1000;

  if (variant === "corner") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-lg ring-1 ring-white/10 backdrop-blur-sm",
          urgent ? "bg-rose-600/90 text-white" : "bg-black/75 text-amber-300",
          className
        )}
        title={label || "Limited-time event"}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span
          className={cn(
            "text-xs font-black tabular-nums tracking-wide leading-none",
            coc && "font-coc"
          )}
        >
          {format(remaining)}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 px-2 py-1 text-center",
          urgent
            ? "bg-rose-500/90 text-white"
            : "bg-amber-500/90 text-amber-950",
          className
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {label && (
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", coc && "font-coc")}>
            {label}
          </span>
        )}
        <span
          className={cn(
            "text-[11px] font-black tabular-nums tracking-wide",
            coc && "font-coc"
          )}
        >
          {format(remaining)}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ring-1",
        urgent
          ? "bg-rose-500/20 text-rose-300 ring-rose-500/40 animate-pulse"
          : "bg-amber-500/20 text-amber-300 ring-amber-500/40",
        coc && "font-coc",
        className
      )}
    >
      <Timer className="h-2.5 w-2.5" />
      {label ? `${label} · ` : ""}
      {format(remaining)}
    </span>
  );
};

export default EventCountdown;


