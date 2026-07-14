import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const BanGate = () => {
  const { user, signOut } = useAuth();
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (!user) {
      setBanned(false);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setBanned(data?.account_status === "banned");
    };
    check();

    const channel = supabase
      .channel(`ban-gate-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          setBanned(payload.new?.account_status === "banned");
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut?.();
    } catch {}
    window.location.href = "/auth/login";
  };

  return (
    <Dialog open={banned}>
      <DialogContent
        className="max-w-sm border-destructive/40 [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-destructive">အကောင့် ပိတ်ခံထားရသည်</DialogTitle>
          <DialogDescription className="text-center leading-relaxed pt-1">
            မင်းဟာ စည်းစမ်းဖောက်တဲ့ အတွက် မင်းရဲ့ အကောင့်ကို ban ခံထားရပါသည်။
            <br />
            <span className="text-xs opacity-80">
              အသေးစိတ်သိရှိလိုပါက Support သို့ ဆက်သွယ်ပါ။
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BanGate;
