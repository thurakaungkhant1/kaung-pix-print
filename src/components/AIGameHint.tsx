import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  gameName: string;
  gameDesc?: string;
}

const AIGameHint = ({ gameName, gameDesc }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>("");
  const { toast } = useToast();

  const fetchHint = async () => {
    setLoading(true);
    setHint("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `I'm about to play a mini-game called "${gameName}"${gameDesc ? ` (${gameDesc})` : ""}. Give me 3 short, practical tips to play better and earn more points. Reply in friendly tone, mixing English with simple Burmese where helpful. Use a numbered list. Keep total reply under 120 words.`,
            },
          ],
        },
      });
      if (error) throw error;
      setHint(data?.response || "No tips available right now.");
    } catch (e: any) {
      toast({ title: "AI hint failed", description: e?.message || "Try again later", variant: "destructive" });
      setHint("AI ကို ဆက်သွယ်လို့ မရသေးပါ။ နောက်မှ ပြန်ကြိုးစားပါ။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !hint) fetchHint(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9 border-primary/40 text-primary hover:bg-primary/10">
          <Sparkles className="h-3.5 w-3.5" /> AI Hints
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Tips — {gameName}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-[120px] text-sm whitespace-pre-wrap leading-relaxed">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> AI က tips တွေ ပြင်ဆင်နေပါသည်...
            </div>
          ) : (
            hint
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchHint} disabled={loading} className="self-end">
          Refresh tips
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AIGameHint;
