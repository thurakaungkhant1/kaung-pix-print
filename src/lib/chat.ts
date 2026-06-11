import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateConversation(currentUserId: string, otherUserId: string): Promise<string | null> {
  if (currentUserId === otherUserId) return null;

  // Look up existing conversation (either ordering)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant1_id.eq.${currentUserId},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ participant1_id: currentUserId, participant2_id: otherUserId })
    .select("id")
    .single();

  if (error) {
    console.error("create conversation failed", error);
    return null;
  }
  return created.id;
}
