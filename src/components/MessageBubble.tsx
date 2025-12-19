import { useState, useRef, useEffect } from "react";
import { Heart, MoreVertical, Pencil, Reply, Trash2, Check, X, CheckCheck, FileIcon, Download, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import ReportDialog from "./ReportDialog";

interface MessageReaction {
  id: string;
  user_id: string;
  reaction_type: string;
}

interface ReplyMessage {
  id: string;
  content: string;
  sender_id: string;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  isDeleted: boolean;
  timestamp: string;
  senderId: string;
  editedAt?: string | null;
  readAt?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  transcription?: string | null;
  reactions: MessageReaction[];
  replyTo?: ReplyMessage | null;
  currentUserId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
  onReply: (id: string) => void;
  onReact: (id: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  searchQuery?: string;
}

const MessageBubble = ({
  id,
  content,
  isOwn,
  isDeleted,
  timestamp,
  senderId,
  editedAt,
  readAt,
  mediaUrl,
  mediaType,
  transcription,
  reactions,
  replyTo,
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  onReact,
  onRemoveReaction,
  searchQuery,
}: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      onReact(id);
    }
    lastTapRef.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimerRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const moveThreshold = 10;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    touchStartRef.current = null;
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setShowMenu(false);
    setTimeout(() => {
      onDelete(id);
    }, 150);
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const userReaction = reactions.find((r) => r.user_id === currentUserId);
  const totalReactions = reactions.length;

  const highlightText = (text: string) => {
    if (!searchQuery?.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-chat-pink/40 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={cn(
        "flex group transition-all duration-300 animate-message-spring",
        isOwn ? "justify-end" : "justify-start",
        isDeleting && "opacity-0 scale-95"
      )}
    >
      <div className="relative max-w-[80%]">
        {/* Reply reference */}
        {replyTo && !isDeleted && (
          <div
            className={cn(
              "text-xs px-4 py-2 rounded-t-[20px] -mb-1",
              "bg-chat-violet-light/50 backdrop-blur-sm",
              "border-l-2 border-chat-violet/50"
            )}
          >
            <span className="text-chat-violet font-medium">Replying to:</span>
            <p className="text-foreground/70 truncate max-w-[200px]">
              {replyTo.content}
            </p>
          </div>
        )}

        <div
          className={cn(
            "rounded-[24px] px-5 py-3 relative shadow-sm transition-all duration-200",
            isDeleted
              ? "bg-muted/50 text-muted-foreground italic"
              : isOwn
              ? "bg-chat-bubble-own text-foreground shadow-chat-pink/20 dark:shadow-chat-violet/20"
              : "bg-chat-bubble-other dark:bg-chat-violet-light/40 text-foreground border border-chat-pink/10 dark:border-chat-violet/20",
            replyTo && !isDeleted && "rounded-tl-lg",
            !isDeleted && "hover:shadow-md dark:hover:shadow-chat-violet/30"
          )}
          onClick={handleDoubleTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isDeleted ? (
            <span className="text-sm">Message deleted</span>
          ) : isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-8 text-sm bg-background/50 border-chat-pink/30 rounded-xl"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 hover:bg-chat-pink/10"
                  onClick={handleEditCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2 bg-chat-pink hover:bg-chat-pink/80 text-white"
                  onClick={handleEditSave}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Media content */}
              {mediaUrl && mediaType === "image" && (
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
                  <img 
                    src={mediaUrl} 
                    alt="Shared image" 
                    className="rounded-2xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  />
                </a>
              )}
              {mediaUrl && mediaType === "audio" && (
                <VoiceMessagePlayer
                  audioUrl={mediaUrl}
                  messageId={id}
                  transcription={transcription}
                  isOwn={isOwn}
                />
              )}
              {mediaUrl && mediaType === "file" && (
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl mb-2 transition-colors",
                    isOwn ? "bg-white/20 hover:bg-white/30" : "bg-chat-pink/10 hover:bg-chat-pink/20"
                  )}
                >
                  <FileIcon className="h-5 w-5 text-chat-pink" />
                  <span className="text-sm underline">Download file</span>
                  <Download className="h-4 w-4" />
                </a>
              )}
              
              {/* Text content */}
              {content && !["📷 Image", "📎 File", "🎤 Voice message"].includes(content) && (
                <p className="text-sm break-words leading-relaxed">{highlightText(content)}</p>
              )}
              
              {/* Message menu */}
              {!isDeleted && (
                <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        isOwn ? "-left-8" : "-right-8",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "p-1.5 rounded-full hover:bg-chat-pink/10"
                      )}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "start" : "end"} className="rounded-xl">
                    {isOwn && (
                      <DropdownMenuItem onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Message
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { onReply(id); setShowMenu(false); }}>
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </DropdownMenuItem>
                    {isOwn && (
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Message
                      </DropdownMenuItem>
                    )}
                    {!isOwn && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setReportDialogOpen(true); setShowMenu(false); }}
                          className="text-destructive"
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          Report Message
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          {/* Timestamp, edited indicator & read receipt */}
          {!isEditing && (
            <div
              className={cn(
                "flex items-center gap-1.5 mt-1.5",
                isOwn ? "text-foreground/60" : "text-muted-foreground"
              )}
            >
              <span className="text-[10px] font-medium">{formatTime(timestamp)}</span>
              {editedAt && (
                <span className="text-[10px] italic">(edited)</span>
              )}
              {isOwn && !isDeleted && (
                readAt ? (
                  <CheckCheck className="h-3.5 w-3.5 text-chat-violet" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )
              )}
            </div>
          )}
        </div>

        {/* Reactions with spring animation */}
        {totalReactions > 0 && !isDeleted && (
          <div
            className={cn(
              "absolute -bottom-2",
              isOwn ? "left-3" : "right-3"
            )}
          >
            <button
              onClick={() => {
                if (userReaction) {
                  onRemoveReaction(id, userReaction.id);
                } else {
                  onReact(id);
                }
              }}
              className={cn(
                "flex items-center gap-0.5 px-2 py-1 rounded-full text-xs",
                "bg-white dark:bg-card border border-chat-pink/30 dark:border-chat-violet/40 shadow-sm dark:shadow-chat-violet/10",
                "hover:scale-110 hover:shadow-md dark:hover:shadow-chat-violet/20 transition-all duration-200",
                "animate-bouncy-appear"
              )}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-all duration-300",
                  userReaction
                    ? "fill-chat-pink text-chat-pink animate-heart-pulse"
                    : "text-chat-pink/60 dark:text-chat-violet/60"
                )}
              />
              {totalReactions > 1 && (
                <span className="text-chat-pink dark:text-chat-violet font-medium animate-spring-pop">{totalReactions}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportedUserId={senderId}
        messageId={id}
        messageContent={content}
        reportType="message"
      />
    </div>
  );
};

export default MessageBubble;
