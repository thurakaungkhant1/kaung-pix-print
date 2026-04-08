import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Bell, Send, Trash2, Plus, Users, User, Image, Link,
  Loader2, Clock, Megaphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import MobileLayout from "@/components/MobileLayout";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  link_url: string | null;
  action_text: string | null;
  target_type: string;
  target_user_id: string | null;
  created_at: string;
}

const NotificationsManage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    image_url: "",
    link_url: "",
    action_text: "",
    target_type: "all",
    target_user_id: "",
  });

  const { isAdmin, user } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) loadNotifications();
  }, [isAdmin]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      title: form.title.trim(),
      message: form.message.trim(),
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      action_text: form.action_text.trim() || null,
      target_type: form.target_type,
      target_user_id: form.target_type === "specific" && form.target_user_id ? form.target_user_id : null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Notification sent successfully!" });
      setShowCreateDialog(false);
      setForm({ title: "", message: "", image_url: "", link_url: "", action_text: "", target_type: "all", target_user_id: "" });
      loadNotifications();
    }
    setSending(false);
  };

  const deleteNotification = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted" });
      loadNotifications();
    }
  };

  if (!isAdmin) return null;

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-xs text-primary-foreground/70">Send notifications to users</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter((n) => n.target_type === "all").length}
                </p>
                <p className="text-xs text-muted-foreground">Broadcast</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <Button onClick={() => setShowCreateDialog(true)} className="w-full gap-2 h-12 text-base">
          <Plus className="h-5 w-5" />
          Send New Notification
        </Button>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <h3 className="font-semibold text-sm truncate">{notif.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {notif.target_type === "all" ? (
                            <><Users className="h-2.5 w-2.5 mr-1" /> All Users</>
                          ) : (
                            <><User className="h-2.5 w-2.5 mr-1" /> Specific</>
                          )}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                        {notif.image_url && <Image className="h-3 w-3 text-muted-foreground" />}
                        {notif.link_url && <Link className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8 flex-shrink-0"
                      onClick={() => deleteNotification(notif.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications sent yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Notification title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write your message..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" /> Image URL (Optional)
              </Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" /> Link URL
                </Label>
                <Input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  value={form.action_text}
                  onChange={(e) => setForm({ ...form, action_text: e.target.value })}
                  placeholder="Open Link"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> All Users</span>
                  </SelectItem>
                  <SelectItem value="specific">
                    <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Specific User</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_type === "specific" && (
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  value={form.target_user_id}
                  onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}
                  placeholder="Enter user ID..."
                />
              </div>
            )}
            <Button onClick={handleSend} className="w-full gap-2" disabled={sending}>
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Notification</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default NotificationsManage;
