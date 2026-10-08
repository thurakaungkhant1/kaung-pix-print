import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = { id?: string; email: string; discount_usd: string };

const ResellersManage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("resellers").select("id,email,discount_usd").order("created_at");
    setRows((data || []).map((r: any) => ({ id: r.id, email: r.email, discount_usd: String(r.discount_usd) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (i: number) => {
    const r = rows[i];
    const email = r.email.trim().toLowerCase();
    const usd = Number(r.discount_usd);
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Valid email ထည့်ပါ");
    if (!(usd >= 0)) return toast.error("USD ပမာဏ မှန်ကန်စွာ ထည့်ပါ");
    setSaving(i);
    const payload = { email, discount_usd: usd, updated_at: new Date().toISOString() };
    const { error } = r.id
      ? await (supabase as any).from("resellers").update(payload).eq("id", r.id)
      : await (supabase as any).from("resellers").insert(payload);
    setSaving(null);
    if (error) return toast.error(error.message.includes("duplicate") ? "ဒီ email ရှိပြီးသားပါ" : error.message);
    toast.success("Saved");
    load();
  };

  const remove = async (i: number) => {
    const r = rows[i];
    if (r.id) {
      const { error } = await (supabase as any).from("resellers").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows((rs) => rs.filter((_, j) => j !== i));
    toast.success("Removed");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Resellers</h1>
            <p className="text-xs text-muted-foreground">KGameShop package တစ်ခုချင်းစီမှာ USD အလိုက် လျှော့ဈေး</p>
          </div>
        </div>
      </header>
      <main className="container max-w-screen-md mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Reseller မရှိသေးပါ</p>}
            {rows.map((r, i) => (
              <Card key={r.id || `new-${i}`}>
                <CardContent className="p-4 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" placeholder="reseller@example.com" value={r.email} onChange={(e) => update(i, { email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discount (USD)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.10" value={r.discount_usd} onChange={(e) => update(i, { discount_usd: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => save(i)} disabled={saving === i}>
                      {saving === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => remove(i)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setRows((rs) => [...rs, { email: "", discount_usd: "" }])}>
              <Plus className="h-4 w-4" /> Add reseller
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default ResellersManage;
