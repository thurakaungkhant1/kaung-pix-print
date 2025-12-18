import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

const TypingIndicator = ({ name, className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1 px-4 py-2.5 rounded-2xl bg-muted">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "600ms" }}
          />
          <span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "600ms" }}
          />
          <span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "600ms" }}
          />
        </div>
      </div>
      {name && (
        <span className="text-xs text-muted-foreground">
          {name} is typing...
        </span>
      )}
    </div>
  );
};

export default TypingIndicator;
