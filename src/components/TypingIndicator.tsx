import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

const TypingIndicator = ({ name, className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center gap-3 animate-fade-in", className)}>
      <div className="flex items-center gap-2 px-5 py-3 rounded-[24px] bg-chat-bubble-other dark:bg-chat-violet-light/50 shadow-sm border border-chat-pink/20 dark:border-chat-violet/30 dark:shadow-chat-violet/10">
        {/* Bouncing dots */}
        <div className="flex gap-1.5 items-center">
          <span
            className="w-2 h-2 bg-chat-pink dark:bg-chat-pink rounded-full animate-dot-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-chat-violet dark:bg-chat-violet rounded-full animate-dot-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-chat-pink dark:bg-chat-pink rounded-full animate-dot-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        
        {/* Pulsing heart */}
        <Heart 
          className="h-3.5 w-3.5 text-chat-pink fill-chat-pink/50 dark:fill-chat-pink/40 animate-heart-pulse ml-1" 
        />
      </div>
      
      {name && (
        <span className="text-xs text-muted-foreground font-medium">
          {name} is typing...
        </span>
      )}
    </div>
  );
};

export default TypingIndicator;
