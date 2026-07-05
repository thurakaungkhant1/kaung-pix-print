// ---------------------------------------------------------------------------
// Allowed realtime broadcast / presence topics.
//
// Enforced server-side by the `realtime.can_access_topic` function and the
// policies on `realtime.messages`. This file is the human-readable index of
// every topic pattern the app is allowed to use. Adding a new topic pattern
// requires a matching migration to update `realtime.can_access_topic`.
// ---------------------------------------------------------------------------

export const RealtimeTopics = {
  /** Global online-user presence — every signed-in user. */
  presenceGlobal: () => "presence:global",

  /** Per-user notification stream. Only auth.uid() may join their own. */
  notifications: (userId: string) => `notifications:${userId}`,

  /** Chat between two participants. Only participants may join. */
  conversation: (conversationId: string) => `conversation:${conversationId}`,

  /** A user's own support thread with admins. */
  supportThread: (userId: string) => `support:${userId}`,

  /** Admin-only support control channel. Requires admin or mobile_admin role. */
  supportAdmin: () => "support:admin",
} as const;

export const REALTIME_ALLOWED_TOPIC_PATTERNS = [
  "presence:global",
  "notifications:<auth.uid()>",
  "conversation:<conversation_id where user is a participant>",
  "support:<auth.uid()>",
  "support:admin (admin / mobile_admin roles only)",
] as const;
