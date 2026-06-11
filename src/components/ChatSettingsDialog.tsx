import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldOff, Shield, AtSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  otherUserId: string;
  otherName?: string;
  onBlockedChange?: (blocked: boolean) => void;
}

const mentionKey = (uid: string, other: string) => `chat_mentions_${uid}_${other}`;

const ChatSettingsDialog = ({
  open,
  onOpenChange,
  currentUserId,
  otherUserId,
  otherName,
  onBlockedChange,
}: Props) => {
  const [blocked, setBlocked] = useState(false);
  const [mentionsOn, setMentionsOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", otherUserId)
        .maybeSingle();
      setBlocked(!!data);
      const stored = localStorage.getItem(mentionKey(currentUserId, otherUserId));
      setMentionsOn(stored === null ? true : stored === "true");
      setLoading(false);
    })();
  }, [open, currentUserId, otherUserId]);

  const toggleBlock = async () => {
    setWorking(true);
    if (blocked) {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", otherUserId);
      if (error) toast.error("Unblock failed", { description: error.message });
      else {
        setBlocked(false);
        onBlockedChange?.(false);
        toast.success("Unblocked");
      }
    } else {
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: currentUserId, blocked_id: otherUserId });
      if (error) toast.error("Block failed", { description: error.message });
      else {
        setBlocked(true);
        onBlockedChange?.(true);
        toast.success("Blocked");
      }
    }
    setWorking(false);
  };

  const toggleMentions = (v: boolean) => {
    setMentionsOn(v);
    localStorage.setItem(mentionKey(currentUserId, otherUserId), String(v));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Chat settings</DialogTitle>
          <DialogDescription>
            {otherName ? `${otherName} နှင့် စကားပြောမှု အပြင်အဆင်` : "Conversation preferences"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AtSign className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Mention alerts</p>
                  <p className="text-xs text-muted-foreground">
                    @me / @you mention မှ notification ပြ
                  </p>
                </div>
              </div>
              <Switch checked={mentionsOn} onCheckedChange={toggleMentions} />
            </div>

            <div className="p-3 rounded-xl border bg-card">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  {blocked ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Shield className="h-4 w-4 text-destructive" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{blocked ? "User is blocked" : "Block user"}</p>
                  <p className="text-xs text-muted-foreground">
                    Block လုပ်ပါက messages ပို့လို့ မရတော့ပါ။
                  </p>
                </div>
              </div>
              <Button
                onClick={toggleBlock}
                disabled={working}
                variant={blocked ? "outline" : "destructive"}
                className="w-full rounded-full"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : blocked ? "Unblock" : "Block"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatSettingsDialog;
