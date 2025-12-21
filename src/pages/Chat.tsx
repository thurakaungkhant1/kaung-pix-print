import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle, Ban, MoreVertical, UserPlus, X, Search, ChevronUp, ChevronDown, ImagePlus, Loader2, FileIcon, UserMinus, Smile, Mic, Heart, Sun, Moon, Crown } from "lucide-react";
import ChatPremiumIndicator from "@/components/ChatPremiumIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import VerificationBadge from "@/components/VerificationBadge";
import OnlineStatus from "@/components/OnlineStatus";
import BottomNav from "@/components/BottomNav";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import VoiceRecorder from "@/components/VoiceRecorder";
import { cn } from "@/lib/utils";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useSoundNotification } from "@/hooks/useSoundNotification";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useTheme } from "@/components/ThemeProvider";
import { compressImage } from "@/lib/imageCompression";
import { usePremiumMembership } from "@/hooks/usePremiumMembership";
import { useChatPointsTimer } from "@/hooks/useChatPointsTimer";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_deleted: boolean;
  edited_at?: string | null;
  reply_to_id?: string | null;
  read_at?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  transcription?: string | null;
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

// Theme toggle button component
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-full hover:bg-chat-pink/10 dark:hover:bg-chat-violet/20 transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-chat-violet group-hover:rotate-12 transition-transform" />
      ) : (
        <Sun className="h-5 w-5 text-chat-pink group-hover:rotate-45 transition-transform" />
      )}
    </button>
  );
};

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
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [amBlocked, setAmBlocked] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [compressionStats, setCompressionStats] = useState<{ [key: number]: { original: number; compressed: number } }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isFriend, sendFriendRequest, getFriendshipStatus, unfriend } = useFriendRequests();
  const { playMessageSound } = useSoundNotification();
  const { isRecipientTyping, sendTypingStatus, sendStopTyping } = useTypingIndicator({
    conversationId,
    userId: user?.id,
    recipientId,
  });
  
  // Premium membership and chat points timer
  const { isPremium } = usePremiumMembership();
  const { recordActivity, totalPointsEarned, elapsedMinutes } = useChatPointsTimer({
    isPremium,
    conversationId,
    isActive: !loading && !!conversationId,
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

  const handleUnfriend = async () => {
    if (!recipientId) return;
    const success = await unfriend(recipientId);
    if (success) {
      setFriendStatus("none");
    }
    setUnfriendDialogOpen(false);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;
    
    const unreadMessages = messages.filter(
      (m) => m.sender_id !== user.id && !m.read_at
    );
    
    if (unreadMessages.length > 0) {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadMessages.map(m => m.id));
    }
  };

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (conversationId && user && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [conversationId, messages.length, user]);

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
              // Mark as read immediately since we're viewing the conversation
              supabase
                .from("messages")
                .update({ read_at: new Date().toISOString() })
                .eq("id", newMsg.id);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate total file count (max 10)
    if (files.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 files at once",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (max 10MB each)
    const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB per file",
        variant: "destructive",
      });
      return;
    }

    // Compress images and track stats
    const processedFiles: File[] = [];
    const newStats: { [key: number]: { original: number; compressed: number } } = {};
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file);
        processedFiles.push(compressed);
        // Track compression stats
        if (compressed.size < file.size) {
          newStats[i] = { original: file.size, compressed: compressed.size };
        }
      } else {
        processedFiles.push(file);
      }
    }

    setSelectedFiles(processedFiles);
    setCompressionStats(newStats);
    
    // Create previews for images
    const urls = processedFiles
      .filter(f => f.type.startsWith("image/"))
      .map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setCompressionStats({});
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    // Update compression stats
    const newStats: { [key: number]: { original: number; compressed: number } } = {};
    Object.entries(compressionStats).forEach(([key, value]) => {
      const keyNum = parseInt(key);
      if (keyNum < index) {
        newStats[keyNum] = value;
      } else if (keyNum > index) {
        newStats[keyNum - 1] = value;
      }
    });
    setCompressionStats(newStats);
    
    // Update preview URLs for images
    const newUrls = newFiles
      .filter(f => f.type.startsWith("image/"))
      .map(f => URL.createObjectURL(f));
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(newUrls);
  };

  const uploadMedia = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    
    // Route to appropriate bucket:
    // - chat-images (public) for images → public URL
    // - chat-voices (private) for audio → signed URL
    const bucketName = isImage ? "chat-images" : "chat-voices";
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    let mediaUrl: string;
    
    if (isImage) {
      // Public URL for images in chat-images bucket
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
      mediaUrl = publicUrlData.publicUrl;
    } else {
      // Signed URL for private files (1 hour expiry)
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(data.path, 3600);

      if (signedUrlError || !urlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        return null;
      }
      mediaUrl = urlData.signedUrl;
    }

    return {
      url: mediaUrl,
      type: isImage ? "image" : isAudio ? "audio" : "file",
    };
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!conversationId || !user) return;

    setIsUploading(true);

    try {
      const fileExt = audioBlob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload voice messages to chat-voices bucket (private)
      const { data, error } = await supabase.storage
        .from("chat-voices")
        .upload(fileName, audioBlob);

      if (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload voice message",
          variant: "destructive",
        });
        return;
      }

      // Use signed URL for private bucket (1 hour expiry)
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("chat-voices")
        .createSignedUrl(data.path, 3600);

      if (signedUrlError || !urlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        toast({
          title: "Error",
          description: "Failed to generate media URL",
          variant: "destructive",
        });
        return;
      }

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: "🎤 Voice message",
        media_url: urlData.signedUrl,
        media_type: "audio",
      });

      setIsRecordingVoice(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !conversationId || !user) return;

    // Record activity for premium chat points
    recordActivity();
    
    setIsUploading(true);

    try {
      // If multiple files, send each as a separate message
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          let file = selectedFiles[i];
          
          // Compress images before upload
          if (file.type.startsWith("image/")) {
            try {
              file = await compressImage(file);
            } catch (err) {
              console.error("Image compression failed, using original:", err);
            }
          }
          
          const uploadResult = await uploadMedia(file);
          
          if (!uploadResult) {
            toast({
              title: "Upload failed",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            });
            continue;
          }

          const messageData: any = {
            conversation_id: conversationId,
            sender_id: user.id,
            content: i === 0 && newMessage.trim() 
              ? newMessage.trim() 
              : (uploadResult.type === "image" ? "📷 Image" : "📎 File"),
            media_url: uploadResult.url,
            media_type: uploadResult.type,
          };

          if (i === 0 && replyingTo) {
            messageData.reply_to_id = replyingTo.id;
          }

          await supabase.from("messages").insert(messageData);
        }
      } else {
        // Text-only message
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
          return;
        }
      }

      setNewMessage("");
      setReplyingTo(null);
      clearSelectedFiles();
      sendStopTyping();
    } finally {
      setIsUploading(false);
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

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = messages
      .filter((m) => !m.is_deleted && m.content.toLowerCase().includes(query.toLowerCase()))
      .map((m) => m.id);
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    
    // Scroll to first result
    if (results.length > 0) {
      scrollToMessage(results[0]);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const navigateSearchResult = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return;
    
    let newIndex: number;
    if (direction === "next") {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex]);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  const isMessageHighlighted = (messageId: string) => {
    return searchResults.includes(messageId) && searchResults[currentSearchIndex] === messageId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-cream chat-bg-pattern flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-chat-pink/20 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-full bg-chat-pink-light hover:bg-chat-pink/20 transition-all duration-200 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 text-chat-pink" />
            </button>
            {recipient && (
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate(`/profile/${recipient.id}`)}
              >
                {/* Avatar with online glow */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-chat-bubble-own flex items-center justify-center font-bold text-foreground shadow-md group-hover:scale-105 transition-transform">
                    {recipient.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Online indicator with glow */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-online-glow" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{recipient.name}</span>
                    <VerificationBadge points={recipient.points} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-emerald-500 font-medium">Online</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Theme toggle, Premium indicator, Heart favorite & Menu */}
          <div className="flex items-center gap-1">
            <ChatPremiumIndicator isPremium={isPremium} pointsEarned={totalPointsEarned} elapsedMinutes={elapsedMinutes} />
            <ThemeToggle />
            <button
              className="p-2.5 rounded-full hover:bg-chat-pink/10 dark:hover:bg-chat-violet/20 transition-colors"
            >
              <Heart className="h-5 w-5 text-chat-pink fill-chat-pink/30" />
            </button>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={cn(
                "p-2.5 rounded-full transition-colors",
                isSearchOpen ? "bg-chat-pink/20 dark:bg-chat-violet/30" : "hover:bg-chat-pink/10 dark:hover:bg-chat-violet/20"
              )}
            >
              <Search className="h-5 w-5 text-chat-pink dark:text-chat-violet" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-full hover:bg-chat-pink/10 transition-colors">
                  <MoreVertical className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-lg rounded-xl border-chat-pink/20">
                {friendStatus === "friends" && (
                  <DropdownMenuItem onClick={() => setUnfriendDialogOpen(true)} className="text-destructive rounded-lg">
                    <UserMinus className="mr-2 h-4 w-4" />
                    Unfriend
                  </DropdownMenuItem>
                )}
                {isBlocked ? (
                  <DropdownMenuItem onClick={handleUnblockUser} className="rounded-lg">
                    <Ban className="mr-2 h-4 w-4" />
                    Unblock User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setBlockDialogOpen(true)} className="text-destructive rounded-lg">
                    <Ban className="mr-2 h-4 w-4" />
                    Block User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search Bar */}
        {isSearchOpen && (
          <div className="mt-3 flex items-center gap-2 animate-fade-in">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-chat-pink/60" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search messages..."
                className="pl-10 h-10 bg-white/60 border-chat-pink/20 rounded-full text-foreground placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-chat-pink font-medium">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearchResult("prev")}
                  className="p-1.5 rounded-full hover:bg-chat-pink/10"
                >
                  <ChevronUp className="h-4 w-4 text-chat-pink" />
                </button>
                <button
                  onClick={() => navigateSearchResult("next")}
                  className="p-1.5 rounded-full hover:bg-chat-pink/10"
                >
                  <ChevronDown className="h-4 w-4 text-chat-pink" />
                </button>
              </div>
            )}
            <button
              onClick={closeSearch}
              className="p-1.5 rounded-full hover:bg-chat-pink/10"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
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
            <div
              key={message.id}
              ref={(el) => (messageRefs.current[message.id] = el)}
              className={cn(
                "transition-all duration-300",
                isMessageHighlighted(message.id) && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl"
              )}
            >
              <MessageBubble
                id={message.id}
                content={message.content}
                isOwn={message.sender_id === user?.id}
                isDeleted={message.is_deleted}
                timestamp={message.created_at}
                senderId={message.sender_id}
                editedAt={message.edited_at}
                readAt={message.read_at}
                mediaUrl={message.media_url}
                mediaType={message.media_type}
                transcription={message.transcription}
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
                searchQuery={searchQuery}
              />
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {isRecipientTyping && (
          <TypingIndicator name={recipient?.name} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && selectedFiles.length === 0 && (
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

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="fixed bottom-[calc(4rem+56px)] left-0 right-0 px-4 animate-slide-up-spring">
          <div className="max-w-screen-xl mx-auto bg-muted/90 dark:bg-muted/80 backdrop-blur-md rounded-t-xl p-3 border border-chat-pink/20 dark:border-chat-violet/30 shadow-lg dark:shadow-chat-violet/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelectedFiles}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="relative shrink-0 animate-bouncy-appear"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {file.type.startsWith("image/") ? (
                    <div className="relative">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`Preview ${index + 1}`} 
                        className="h-16 w-16 object-cover rounded-lg ring-2 ring-chat-pink/20 dark:ring-chat-violet/30 hover:ring-chat-pink/50 dark:hover:ring-chat-violet/50 transition-all hover:scale-105"
                      />
                      {compressionStats[index] && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-medium rounded-full whitespace-nowrap shadow-sm">
                          -{Math.round((1 - compressionStats[index].compressed / compressionStats[index].original) * 100)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-background rounded-lg flex items-center justify-center ring-2 ring-chat-pink/20 dark:ring-chat-violet/30 hover:ring-chat-pink/50 dark:hover:ring-chat-violet/50 transition-all hover:scale-105">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={cn(
        "fixed left-0 right-0 p-4",
        "bg-white/70 backdrop-blur-xl border-t border-chat-pink/20",
        "bottom-0"
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
        ) : isRecordingVoice ? (
          <div className="max-w-screen-xl mx-auto">
            <VoiceRecorder
              onSend={sendVoiceMessage}
              onCancel={() => setIsRecordingVoice(false)}
              isUploading={isUploading}
            />
          </div>
        ) : (
          <div className="max-w-screen-xl mx-auto flex gap-2 items-center">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
            />
            
            {/* Media upload button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-11 w-11 shrink-0 bg-chat-pink-light hover:bg-chat-pink/20 text-chat-pink"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            
            {/* Emoji picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 shrink-0"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0 border-0 animate-spring-pop shadow-xl dark:shadow-chat-violet/20" 
                side="top" 
                align="start"
              >
                <div className="rounded-xl overflow-hidden ring-2 ring-chat-pink/20 dark:ring-chat-violet/30">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={Theme.AUTO}
                    lazyLoadEmojis
                    height={350}
                    width={300}
                  />
                </div>
              </PopoverContent>
            </Popover>
            
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
              placeholder={selectedFiles.length > 0 ? "Add a caption..." : replyingTo ? "Type your reply..." : "Type a message..."}
              className="flex-1 rounded-full h-11 bg-white/60 border-chat-pink/20 focus:border-chat-pink/40 placeholder:text-muted-foreground/50"
              onKeyPress={(e) => e.key === "Enter" && !isUploading && sendMessage()}
              onBlur={sendStopTyping}
            />
            
            {/* Heart Send or Voice button */}
            {newMessage.trim() || selectedFiles.length > 0 ? (
              <Button
                onClick={sendMessage}
                disabled={isUploading}
                className="rounded-full h-11 w-11 p-0 bg-chat-bubble-own hover:opacity-90 shadow-md"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-chat-pink" />
                ) : (
                  <Heart className="h-5 w-5 text-chat-pink fill-chat-pink" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-11 w-11 shrink-0 bg-chat-pink-light hover:bg-chat-pink/20 text-chat-pink"
                onClick={() => setIsRecordingVoice(true)}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
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

      {/* Unfriend Confirmation */}
      <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {recipient?.name} from your friends? You'll need to send a new friend request to chat again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnfriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;
