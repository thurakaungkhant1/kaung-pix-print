import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Sparkles } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

const CompleteProfile = () => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        if (data.name) {
          navigate("/", { replace: true });
          return;
        }
        setName(data.name || "");
      }
    })();
  }, [user, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: trimmedName })
      .eq("id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome to Kaung Digital Store! 🎉" });
    navigate("/", { replace: true });
  };

  return (
    <MobileLayout className="min-h-screen flex flex-col bg-background">
      <div className="relative h-52 w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.7),transparent_70%),linear-gradient(135deg,hsl(var(--primary)/0.4),hsl(var(--accent)/0.5))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="relative z-[1] h-full flex flex-col items-center justify-center gap-2">
          <div className="h-16 w-16 rounded-2xl bg-card shadow-xl flex items-center justify-center ring-1 ring-border/50">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-display font-extrabold tracking-wide text-foreground">
            KAUNG DIGITAL STORE
          </h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 px-6 pt-4 pb-10"
      >
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-2xl font-display font-bold">Complete your profile</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Just one more step — tell us your name and phone number.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 pl-10" placeholder="Your name" />
              </div>
            </div>


            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full text-base font-semibold mt-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
            </Button>
          </form>
        </div>
      </motion.div>
    </MobileLayout>
  );
};

export default CompleteProfile;
