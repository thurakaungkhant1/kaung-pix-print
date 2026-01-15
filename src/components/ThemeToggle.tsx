import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "hero" | "compact";
}

export const ThemeToggle = ({ className, variant = "default" }: ThemeToggleProps) => {
  const { theme, toggleTheme, isTransitioning } = useTheme();

  const iconVariants = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 }
  };

  const IconComponent = () => (
    <AnimatePresence mode="wait">
      {theme === "light" ? (
        <motion.div
          key="moon"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Moon className="h-5 w-5 text-primary" />
        </motion.div>
      ) : (
        <motion.div
          key="sun"
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Sun className="h-5 w-5 text-primary" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (variant === "hero") {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          disabled={isTransitioning}
          className={cn(
            "rounded-full border-primary/30 bg-background/50 backdrop-blur-sm",
            "hover:bg-background/80 hover:border-primary/50",
            "transition-all duration-300 relative overflow-hidden",
            isTransitioning && "pointer-events-none",
            className
          )}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {/* Ripple effect on toggle */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                initial={{ scale: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
          <IconComponent />
        </Button>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.button
        onClick={toggleTheme}
        disabled={isTransitioning}
        className={cn(
          "p-2 rounded-full transition-all duration-300 relative overflow-hidden",
          "hover:bg-muted active:scale-95",
          isTransitioning && "pointer-events-none",
          className
        )}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <IconComponent />
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        disabled={isTransitioning}
        className={cn(
          "transition-all duration-300 relative overflow-hidden",
          isTransitioning && "pointer-events-none",
          className
        )}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              className="absolute inset-0 rounded-md bg-primary/20"
              initial={{ scale: 0 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
        <IconComponent />
      </Button>
    </motion.div>
  );
};

export default ThemeToggle;
