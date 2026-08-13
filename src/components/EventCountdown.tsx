import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCountdownProps {
  /** ISO timestamp when the event ends */
  endsAt: string;
  /** Optional label shown before the timer, e.g. "EVENT" */
  label?: string | null;
  className?: string;
  /** Use the Clash of Clans display font */
  coc?: boolean;
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

/** Live countdown badge for limited-time product events. Hides itself once expired. */
export const EventCountdown = ({ endsAt, label, className, coc }: EventCountdownProps) => {
  const target = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    setRemaining(target - Date.now());
    const id = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || Number.isNaN(target) || remaining <= 0) return null;

  const urgent = remaining < 60 * 60 * 1000;

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
