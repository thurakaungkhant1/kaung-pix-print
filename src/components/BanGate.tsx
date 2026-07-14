import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut } from "lucide-react";

const BanGate = () => {
  const { user, signOut } = useAuth();
  const [banned, setBanned] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) {
      setBanned(false);
      setReason(null);
      return;
    }
    let cancelled = false;

    const apply = (status?: string | null, banReason?: string | null) => {
      if (cancelled) return;
      const isBanned = status === "banned";
      setBanned(isBanned);
      setReason(isBanned ? banReason ?? null : null);
    };

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_status, ban_reason")
        .eq("id", user.id)
        .maybeSingle();
      apply(data?.account_status, (data as any)?.ban_reason);
    };
    check();

    const channel = supabase
      .channel(`ban-gate-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => apply(payload.new?.account_status, payload.new?.ban_reason)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Lock body scroll & interaction when banned as a belt-and-suspenders block
  useEffect(() => {
    if (!banned) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [banned]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut?.();
    } catch {}
    window.location.href = "/auth/login";
  };

  if (!banned) return null;

  return (
    <>
      {/* Full-screen opaque shield above everything else to guarantee no tab is reachable */}
      <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-sm" aria-hidden="true" />
      <Dialog open>
        <DialogContent
          className="max-w-sm border-destructive/40 z-[9999] [&>button]:hidden"
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
            </DialogDescription>
          </DialogHeader>

          {reason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-1">
                Reason / အကြောင်းအရင်း
              </p>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{reason}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            အသေးစိတ်သိရှိလိုပါက Support သို့ ဆက်သွယ်ပါ။
          </p>

          <DialogFooter>
            <Button variant="destructive" className="w-full" onClick={handleSignOut} disabled={signingOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {signingOut ? "Signing out…" : "Sign Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BanGate;
