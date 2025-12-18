import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flag, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName?: string;
  messageId?: string;
  messageContent?: string;
  reportType: "account" | "message";
}

const REPORT_REASONS = {
  account: [
    { value: "spam", label: "Spam or scam" },
    { value: "harassment", label: "Harassment or bullying" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "impersonation", label: "Impersonation" },
    { value: "fake_account", label: "Fake account" },
    { value: "other", label: "Other" },
  ],
  message: [
    { value: "spam", label: "Spam" },
    { value: "harassment", label: "Harassment or threats" },
    { value: "hate_speech", label: "Hate speech" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "scam", label: "Scam or fraud" },
    { value: "other", label: "Other" },
  ],
};

const ReportDialog = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
  messageId,
  messageContent,
  reportType,
}: ReportDialogProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const reasons = REPORT_REASONS[reportType];

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Please select a reason",
        description: "Select why you're reporting this " + (reportType === "account" ? "account" : "message"),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to submit a report",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        message_id: messageId || null,
        report_type: reportType,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });

      // Reset and close
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Report error:", error);
      toast({
        title: "Failed to submit report",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report {reportType === "account" ? "Account" : "Message"}
          </DialogTitle>
          <DialogDescription>
            {reportType === "account" ? (
              <>Report <strong>{reportedUserName || "this user"}</strong> for violating our community guidelines.</>
            ) : (
              <>Report this message for violating our community guidelines.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show message preview if reporting a message */}
          {reportType === "message" && messageContent && (
            <div className="p-3 bg-muted rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Reported message:</p>
              <p className="text-sm line-clamp-3">{messageContent}</p>
            </div>
          )}

          {/* Reason selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {reasons.map((r) => (
                <div
                  key={r.value}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    reason === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onClick={() => setReason(r.value)}
                >
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="cursor-pointer flex-1">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional details */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Warning note */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              False reports may result in action against your account. Only report genuine violations.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-destructive hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;