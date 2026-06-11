import { supabase } from "@/integrations/supabase/client";

export type FriendStatus = "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

export interface FriendRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const getFriendStatus = async (
  meId: string,
  otherId: string
): Promise<{ status: FriendStatus; row?: FriendRow }> => {
  // Check block first
  const { data: blocks } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${meId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${meId})`
    );
  if (blocks && blocks.length > 0) return { status: "blocked" };

  const { data } = await supabase
    .from("friend_requests")
    .select("*")
    .or(
      `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { status: "none" };
  if (data.status === "accepted") return { status: "accepted", row: data as FriendRow };
  if (data.status === "pending") {
    return {
      status: data.sender_id === meId ? "pending_out" : "pending_in",
      row: data as FriendRow,
    };
  }
  return { status: "none", row: data as FriendRow };
};

export const sendFriendRequest = async (meId: string, otherId: string) => {
  // Remove old rejected/cancelled rows so a fresh request works.
  await supabase
    .from("friend_requests")
    .delete()
    .or(
      `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`
    )
    .neq("status", "accepted");
  return supabase
    .from("friend_requests")
    .insert({ sender_id: meId, receiver_id: otherId, status: "pending" })
    .select()
    .single();
};

export const cancelFriendRequest = async (rowId: string) =>
  supabase.from("friend_requests").delete().eq("id", rowId);

export const respondFriendRequest = async (rowId: string, accept: boolean) =>
  supabase
    .from("friend_requests")
    .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", rowId);

export const unfriend = async (rowId: string) =>
  supabase.from("friend_requests").delete().eq("id", rowId);
