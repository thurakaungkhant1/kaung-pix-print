import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * In-app toasts for friend request events while the app is open:
 * - New incoming request
 * - My outgoing request was accepted (or rejected)
 */
const FriendRequestNotifier = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`friend-req-notify-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friend_requests" },
        async (payload: any) => {
          const row = payload.new;
          if (!row || row.receiver_id !== user.id || row.status !== "pending") return;
          const { data: prof } = await supabase
            .from("public_profiles")
            .select("name")
            .eq("id", row.sender_id)
            .maybeSingle();
          const name = prof?.name || "Someone";
          toast(`👋 ${name}`, {
            description: "သင့်ကို သူငယ်ချင်းအဖြစ် ဖိတ်ခေါ်ထားသည်",
            action: {
              label: "View",
              onClick: () => navigate("/messages?tab=requests"),
            },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friend_requests" },
        async (payload: any) => {
          const row = payload.new;
          if (!row || row.sender_id !== user.id) return;
          if (payload.old?.status === row.status) return;
          if (row.status === "accepted") {
            const { data: prof } = await supabase
              .from("public_profiles")
              .select("name")
              .eq("id", row.receiver_id)
              .maybeSingle();
            const name = prof?.name || "User";
            toast.success(`🎉 ${name} accepted your request`, {
              description: "ယခု စကားပြောလို့ ရပါပြီ",
              action: {
                label: "Message",
                onClick: () => navigate("/messages?tab=friends"),
              },
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, navigate]);

  return null;
};

export default FriendRequestNotifier;
