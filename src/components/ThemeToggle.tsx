import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "hero" | "compact";
}

export const ThemeToggle = ({ className, variant = "default" }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  if (variant === "hero") {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          "rounded-full border-primary/30 bg-background/50 backdrop-blur-sm",
          "hover:bg-background/80 hover:border-primary/50",
          "transition-all duration-300",
          className
        )}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "p-2 rounded-full transition-all duration-300",
          "hover:bg-muted active:scale-95",
          className
        )}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("transition-all duration-300", className)}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;
