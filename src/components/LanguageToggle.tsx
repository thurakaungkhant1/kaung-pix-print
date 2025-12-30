import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  variant?: "default" | "hero";
  className?: string;
}

const LanguageToggle = ({ variant = "default", className }: LanguageToggleProps) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "my" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={cn(
        "gap-1.5 px-2 h-9 rounded-full transition-all",
        variant === "hero" && "bg-background/10 hover:bg-background/20 backdrop-blur-sm text-foreground",
        className
      )}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">
        {language === "en" ? "EN" : "မြ"}
      </span>
    </Button>
  );
};

export default LanguageToggle;