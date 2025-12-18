import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Ban, MoreVertical, UserPlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import VerificationBadge from "@/components/VerificationBadge";
import OnlineStatus from "@/components/OnlineStatus";
import BottomNav from "@/components/BottomNav";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { cn } from "@/lib/utils";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useSoundNotification } from "@/hooks/useSoundNotification";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_deleted: boolean;
  edited_at?: string | null;
  reply_to_id?: string | null;
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
}

interface Participant {
  id: string;
  name: string;
  points: number;
}

const Chat = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [amBlocked, setAmBlocked] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isFriend, sendFriendRequest, getFriendshipStatus } = useFriendRequests();
  const { playMessageSound } = useSoundNotification();
  const { isRecipientTyping, sendTypingStatus, sendStopTyping } = useTypingIndicator({
    conversationId,
    userId: user?.id,
    recipientId,
  });

  useEffect(() => {
    if (user && recipientId) {
      loadOrCreateConversation();
      loadRecipient();
      checkBlockStatus();
      checkFriendStatus();
    }
  }, [user, recipientId]);

  const checkFriendStatus = async () => {
    if (!recipientId) return;
    const status = await getFriendshipStatus(recipientId);
    setFriendStatus(status);
  };

  const handleAddFriend = async () => {
    if (!recipientId) return;
    const success = await sendFriendRequest(recipientId);
    if (success) {
      setFriendStatus("pending_sent");
    }
  };

  const checkBlockStatus = async () => {
    if (!user || !recipientId) return;

    const { data: blockedByMe } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", recipientId)
      .maybeSingle();

    setIsBlocked(!!blockedByMe);

    const { data: blockedMe } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", recipientId)
      .eq("blocked_id", user.id)
      .maybeSingle();

    setAmBlocked(!!blockedMe);
  };

  const handleBlockUser = async () => {
    if (!user || !recipientId) return;

    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: recipientId,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to block user", variant: "destructive" });
    } else {
      toast({ title: "User Blocked", description: "You won't receive messages from this user" });
      setIsBlocked(true);
    }
    setBlockDialogOpen(false);
  };

  const handleUnblockUser = async () => {
    if (!user || !recipientId) return;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", recipientId);

    if (error) {
      toast({ title: "Error", description: "Failed to unblock user", variant: "destructive" });
    } else {
      toast({ title: "User Unblocked", description: "You can now receive messages from this user" });
      setIsBlocked(false);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
            // Play sound for received messages
            if (newMsg.sender_id !== user?.id) {
              playMessageSound();
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, playMessageSound]);

  // Subscribe to reactions
  useEffect(() => {
    if (!conversationId) return;

    const loadReactions = async () => {
      const messageIds = messages.map((m) => m.id);
      if (messageIds.length === 0) return;

      const { data } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);

      if (data) {
        setReactions(data);
      }
    };

    loadReactions();

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadRecipient = async () => {
    if (!recipientId) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, name, points")
      .eq("id", recipientId)
      .single();

    if (data) {
      setRecipient(data);
    }
  };

  const loadOrCreateConversation = async () => {
    if (!user || !recipientId) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${recipientId}),and(participant1_id.eq.${recipientId},participant2_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      setConversationId(existing.id);
      await loadMessages(existing.id);
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant1_id: user.id,
          participant2_id: recipientId,
        })
        .select("id")
        .single();

      if (newConv) {
        setConversationId(newConv.id);
      } else if (error) {
        console.error("Error creating conversation:", error);
      }
    }
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    const messageData: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    };

    if (replyingTo) {
      messageData.reply_to_id = replyingTo.id;
    }

    const { error } = await supabase.from("messages").insert(messageData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
      setReplyingTo(null);
      sendStopTyping();
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    const { error } = await supabase
      .from("messages")
      .update({ is_deleted: true })
      .eq("id", messageToDelete);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ 
        content: newContent, 
        edited_at: new Date().toISOString() 
      })
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const handleReactToMessage = async (messageId: string) => {
    if (!user) return;

    const existingReaction = reactions.find(
      (r) => r.message_id === messageId && r.user_id === user.id
    );

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);
    } else {
      // Add reaction
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        reaction_type: "love",
      });
    }
  };

  const handleRemoveReaction = async (messageId: string, reactionId: string) => {
    await supabase.from("message_reactions").delete().eq("id", reactionId);
  };

  const getMessageReactions = (messageId: string) => {
    return reactions.filter((r) => r.message_id === messageId);
  };

  const getReplyMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {recipient && (
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate(`/profile/${recipient.id}`)}
              >
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold">
                  {recipient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{recipient.name}</span>
                    <VerificationBadge points={recipient.points} size="sm" />
                  </div>
                  <OnlineStatus userId={recipient.id} size="sm" />
                </div>
              </div>
            )}
          </div>
          
          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isBlocked ? (
                <DropdownMenuItem onClick={handleUnblockUser}>
                  <Ban className="mr-2 h-4 w-4" />
                  Unblock User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setBlockDialogOpen(true)} className="text-destructive">
                  <Ban className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <MessageCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground/70">
              Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              id={message.id}
              content={message.content}
              isOwn={message.sender_id === user?.id}
              isDeleted={message.is_deleted}
              timestamp={message.created_at}
              editedAt={message.edited_at}
              reactions={getMessageReactions(message.id)}
              replyTo={getReplyMessage(message.reply_to_id)}
              currentUserId={user?.id || ""}
              onDelete={(id) => {
                setMessageToDelete(id);
                setDeleteDialogOpen(true);
              }}
              onEdit={handleEditMessage}
              onReply={(id) => {
                const msg = messages.find((m) => m.id === id);
                if (msg) setReplyingTo(msg);
              }}
              onReact={handleReactToMessage}
              onRemoveReaction={handleRemoveReaction}
            />
          ))
        )}
        
        {/* Typing Indicator */}
        {isRecipientTyping && (
          <TypingIndicator name={recipient?.name} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="fixed bottom-[calc(4rem+56px)] left-0 right-0 px-4">
          <div className="max-w-screen-xl mx-auto bg-muted rounded-t-xl p-3 flex items-center justify-between border-l-2 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Replying to</p>
              <p className="text-sm truncate">{replyingTo.content}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-background rounded-full"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={cn(
        "fixed left-0 right-0 p-4 bg-background border-t border-border",
        replyingTo ? "bottom-16" : "bottom-16"
      )}>
        {friendStatus !== "friends" ? (
          <div className="text-center">
            {friendStatus === "pending_sent" ? (
              <p className="text-muted-foreground text-sm">
                Friend request sent. Waiting for response.
              </p>
            ) : friendStatus === "pending_received" ? (
              <p className="text-muted-foreground text-sm">
                Accept friend request to start chatting.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground text-sm">
                  Add as friend to start chatting
                </p>
                <Button onClick={handleAddFriend} size="sm" className="gap-1">
                  <UserPlus className="h-4 w-4" />
                  Add Friend
                </Button>
              </div>
            )}
          </div>
        ) : amBlocked ? (
          <p className="text-center text-muted-foreground text-sm">
            You cannot send messages to this user
          </p>
        ) : isBlocked ? (
          <p className="text-center text-muted-foreground text-sm">
            You have blocked this user. Unblock to send messages.
          </p>
        ) : (
          <div className="max-w-screen-xl mx-auto flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (e.target.value) {
                  sendTypingStatus();
                } else {
                  sendStopTyping();
                }
              }}
              placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
              className="flex-1 rounded-full h-12"
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              onBlur={sendStopTyping}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="rounded-full h-12 w-12 p-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for everyone. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked users won't be able to send you messages. You can unblock them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Chat;
