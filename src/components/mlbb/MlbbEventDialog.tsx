import { useNavigate } from "react-router-dom";
import { CalendarDays, ExternalLink, Gem, Quote, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  categoryLabel, eventStatus, formatYangonDateTime, MLBB_TOPUP_ROUTE, type MlbbEvent,
} from "@/lib/mlbbEvents";
import { EventArtwork, LiveCountdown, StatusBadge, VerificationBadge } from "./MlbbEventCard";

const MlbbEventDialog = ({ event, onClose }: { event: MlbbEvent | null; onClose: () => void }) => {
  const navigate = useNavigate();
  const status = event ? eventStatus(event) : "upcoming";
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {event && (
          <>
            <div className="aspect-[16/8] w-full overflow-hidden bg-muted"><EventArtwork event={event} /></div>
            <div className="space-y-4 p-5 pt-3">
              <DialogHeader className="space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={status} />
                  <VerificationBadge verification={event.verification} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{categoryLabel(event.category)}</span>
                </div>
                <DialogTitle className="font-display text-xl leading-snug">{event.title}</DialogTitle>
                {event.description && <DialogDescription className="text-sm">{event.description}</DialogDescription>}
              </DialogHeader>

              <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Starts:</span> {event.starts_at ? formatYangonDateTime(event.starts_at) : "Not announced"}
                </p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Ends:</span> {event.ends_at ? formatYangonDateTime(event.ends_at) : "Not announced"}
                </p>
                <p className="text-[11px] text-muted-foreground">All times in Myanmar time (Asia/Yangon).</p>
                <LiveCountdown event={event} className="pt-1" />
              </div>

              {event.verification === "tentative" && (
                <p className="rounded-xl border border-highlight/50 bg-highlight/10 p-3 text-xs">
                  These dates are <b>not officially confirmed</b> yet and may change.
                </p>
              )}
              {event.schedule_changed_at && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5" /> Schedule updated by the source on {formatYangonDateTime(event.schedule_changed_at)}</p>
              )}
              {event.evidence && (
                <blockquote className="flex gap-2 rounded-xl bg-muted/40 p-3 text-xs italic text-muted-foreground">
                  <Quote className="h-4 w-4 shrink-0 text-primary" /> “{event.evidence}”
                </blockquote>
              )}

              <div className="flex flex-wrap gap-2">
                {event.show_topup && status !== "ended" && (
                  <Button onClick={() => navigate(MLBB_TOPUP_ROUTE)} className="rounded-full"><Gem className="mr-1.5 h-4 w-4" /> Top Up Diamonds</Button>
                )}
                {event.source_url && (
                  <Button asChild variant="outline" className="rounded-full">
                    <a href={event.source_url} target="_blank" rel="noopener noreferrer">
                      {event.source_name || "Source"} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MlbbEventDialog;
