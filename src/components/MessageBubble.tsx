import { useState, useRef } from "react";
import { Heart, MoreVertical, Pencil, Reply, Trash2, Check, X, CheckCheck, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

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
  const lastTapRef = useRef<number>(0);

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
      // Double tap detected
      onReact(id);
    }
    lastTapRef.current = now;
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

  // Highlight search matches in content
  const highlightText = (text: string) => {
    if (!searchQuery?.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={cn("flex group", isOwn ? "justify-end" : "justify-start")}
    >
      <div className="relative max-w-[80%]">
        {/* Reply reference */}
        {replyTo && !isDeleted && (
          <div
            className={cn(
              "text-xs px-3 py-1.5 rounded-t-xl -mb-1 bg-muted/50",
              "border-l-2 border-primary/50"
            )}
          >
            <span className="text-muted-foreground">Replying to:</span>
            <p className="text-foreground/70 truncate max-w-[200px]">
              {replyTo.content}
            </p>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 relative",
            isDeleted
              ? "bg-muted/50 text-muted-foreground italic"
              : isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            replyTo && !isDeleted && "rounded-tl-none"
          )}
          onClick={handleDoubleTap}
        >
          {isDeleted ? (
            <span className="text-sm">Message deleted</span>
          ) : isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-8 text-sm bg-background/50"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={handleEditCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2"
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
                    className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
                    "flex items-center gap-2 p-2 rounded-lg mb-2",
                    isOwn ? "bg-primary-foreground/10" : "bg-background/50"
                  )}
                >
                  <FileIcon className="h-5 w-5" />
                  <span className="text-sm underline">Download file</span>
                  <Download className="h-4 w-4" />
                </a>
              )}
              
              {/* Text content - hide if it's just the media placeholder */}
              {content && !["📷 Image", "📎 File", "🎤 Voice message"].includes(content) && (
                <p className="text-sm break-words">{highlightText(content)}</p>
              )}
              
              {/* Message menu for own messages */}
              {isOwn && !isDeleted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "absolute -left-8 top-1/2 -translate-y-1/2",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "p-1.5 rounded-full hover:bg-muted"
                      )}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Message
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReply(id)}>
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Reply option for received messages */}
              {!isOwn && !isDeleted && (
                <button
                  onClick={() => onReply(id)}
                  className={cn(
                    "absolute -right-8 top-1/2 -translate-y-1/2",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "p-1.5 rounded-full hover:bg-muted"
                  )}
                >
                  <Reply className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </>
          )}

          {/* Timestamp, edited indicator & read receipt */}
          {!isEditing && (
            <div
              className={cn(
                "flex items-center gap-1 mt-1",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              <span className="text-[10px]">{formatTime(timestamp)}</span>
              {editedAt && (
                <span className="text-[10px] italic">(edited)</span>
              )}
              {/* Read receipt - only show for own messages */}
              {isOwn && !isDeleted && (
                readAt ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {totalReactions > 0 && !isDeleted && (
          <div
            className={cn(
              "absolute -bottom-2",
              isOwn ? "left-2" : "right-2"
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
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs",
                "bg-background border border-border shadow-sm",
                "hover:scale-110 transition-transform"
              )}
            >
              <Heart
                className={cn(
                  "h-3 w-3",
                  userReaction
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                )}
              />
              {totalReactions > 1 && (
                <span className="text-muted-foreground">{totalReactions}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
