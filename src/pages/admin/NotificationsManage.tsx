import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileLayout from "@/components/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bell, Loader2, Send, Trash2 } from "lucide-react";

interface Row {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  link_url: string | null;
  action_text: string | null;
  created_at: string;
}

const NotificationsManage = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    image_url: "",
    link_url: "",
    action_text: "",
  });

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id,title,message,image_url,link_url,action_text,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await (supabase as any).from("notifications").insert({
      title: form.title.trim(),
      message: form.message.trim(),
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      action_text: form.action_text.trim() || null,
      target_type: "all",
      created_by: user?.id,
    });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notification sent to all users" });
    setForm({ title: "", message: "", image_url: "", link_url: "", action_text: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  if (adminLoading || loading) {
    return (
      <MobileLayout className="pb-20">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="pb-24">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <Bell className="h-6 w-6" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">In-App Notifications</h1>
            <p className="text-xs opacity-80">Send an alert to every user</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New promotion!" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write the notification body..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Image link (optional)</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Link (optional)</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/game" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Button text</Label>
                <Input value={form.action_text} onChange={(e) => setForm({ ...form, action_text: e.target.value })} placeholder="Open" />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to all users
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-bold">Sent</h2>
          {rows.length === 0 && <p className="text-xs text-muted-foreground">Nothing sent yet.</p>}
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default NotificationsManage;
