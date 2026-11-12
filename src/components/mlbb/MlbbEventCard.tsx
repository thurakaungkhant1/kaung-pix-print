import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ExternalLink, Gem, ShieldCheck, AlertTriangle, Sparkles, Star, Trophy, Handshake, Shirt, Wallet, Timer, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabel, countdownTarget, eventStatus, formatCountdown, formatRange, MLBB_TOPUP_ROUTE,
  type MlbbEvent, type EventStatus,
} from "@/lib/mlbbEvents";

export const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  skins: Shirt, starlight: Star, diamond: Gem, recharge: Wallet, collab: Handshake, special: Sparkles, esports: Trophy,
};

const useNow = (ms = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
};

export const StatusBadge = ({ status, className }: { status: EventStatus; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
      status === "live" && "bg-primary text-primary-foreground",
      status === "upcoming" && "bg-highlight text-highlight-foreground",
      status === "ended" && "bg-muted text-muted-foreground",
      className,
    )}
  >
    {status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />}
    {status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Ended"}
  </span>
);

export const VerificationBadge = ({ verification, className }: { verification: MlbbEvent["verification"]; className?: string }) =>
  verification === "verified" ? (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary", className)}>
      <ShieldCheck className="h-3 w-3" /> Verified
    </span>
  ) : (
    <span
      title="Not officially confirmed yet — dates may change"
      className={cn("inline-flex items-center gap-1 rounded-full border border-highlight/50 bg-highlight/15 px-2 py-0.5 text-[10px] font-bold text-foreground", className)}
    >
      <AlertTriangle className="h-3 w-3" /> Tentative
    </span>
  );

export const LiveCountdown = ({ event, className }: { event: MlbbEvent; className?: string }) => {
  const now = useNow();
  const target = countdownTarget(event, now);
  if (!target) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums", className)}>
      <Timer className="h-3.5 w-3.5 text-primary" /> {target.label} {formatCountdown(target.at - now)}
    </span>
  );
};

export const EventArtwork = ({ event, className }: { event: MlbbEvent; className?: string }) => {
  const Icon = CATEGORY_ICON[event.category] ?? Sparkles;
  if (event.image_url && event.image_permitted) {
    return <img src={event.image_url} alt={event.title} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  }
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-nav text-nav-foreground", className)}>
      <div className="absolute inset-0 opacity-60" style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-nav-foreground/10 blur-xl" />
      <Icon className="relative h-10 w-10 text-nav-foreground/85" />
    </div>
  );
};

interface CardProps {
  event: MlbbEvent;
  onDetails: (e: MlbbEvent) => void;
  compact?: boolean;
  className?: string;
}

const MlbbEventCard = ({ event, onDetails, compact, className }: CardProps) => {
  const navigate = useNavigate();
  const status = eventStatus(event);
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-lg", className)}>
      <div className={cn("relative overflow-hidden bg-muted", compact ? "aspect-[16/8]" : "aspect-[16/9]")}>
        <EventArtwork event={event} className="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <StatusBadge status={status} />
          <VerificationBadge verification={event.verification} className="bg-card/90 backdrop-blur" />
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col gap-1.5", compact ? "p-3" : "p-4")}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{categoryLabel(event.category)}</p>
        <h3 className={cn("font-display font-bold leading-snug line-clamp-2", compact ? "text-sm" : "text-base")}>{event.title}</h3>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> {formatRange(event)} <span className="opacity-70">(MMT)</span>
        </p>
        <LiveCountdown event={event} />
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          <button
            onClick={() => onDetails(event)}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:bg-accent transition-colors"
          >
            <Info className="h-3.5 w-3.5" /> View Details
          </button>
          {event.show_topup && status !== "ended" && (
            <button
              onClick={() => navigate(MLBB_TOPUP_ROUTE)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <Gem className="h-3.5 w-3.5" /> Top Up
            </button>
          )}
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open source announcement"
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-muted-foreground hover:text-primary"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default MlbbEventCard;
