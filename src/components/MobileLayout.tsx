import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

const MobileLayout = ({ children, className, hideNav }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen desktop-wrapper flex justify-center items-start relative overflow-hidden">
      {/* Animated gradient background for desktop */}
      <div className="hidden md:block absolute inset-0 desktop-gradient-bg" />
      
      {/* Floating orbs for desktop */}
      <div className="hidden md:block">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-40"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)' }}
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-30"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.3), transparent)' }}
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div 
          className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full blur-[80px] opacity-25"
          style={{ background: 'radial-gradient(circle, hsl(175 100% 45% / 0.2), transparent)' }}
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Decorative sparkles for desktop */}
      <div className="hidden md:flex absolute top-20 left-20 text-primary/30">
        <Sparkles className="h-8 w-8 animate-pulse" />
      </div>
      <div className="hidden md:flex absolute bottom-32 right-24 text-accent/30">
        <Sparkles className="h-6 w-6 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      <div className="hidden md:flex absolute top-1/3 right-16 text-primary/20">
        <Sparkles className="h-5 w-5 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* App Title for Desktop - Above phone */}
      <div className="hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-10">
        <motion.h1 
          className="text-4xl font-display font-black tracking-tight"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="text-foreground/90">Kaung </span>
          <span className="text-gradient">Computer</span>
        </motion.h1>
        <motion.p 
          className="text-sm text-muted-foreground/70 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Photography & Digital Services
        </motion.p>
      </div>

      {/* Phone Frame Container */}
      <motion.div
        className={cn(
          "w-full max-w-[480px] min-h-screen bg-background relative z-10",
          // Mobile: full width, no frame
          "md:min-h-0 md:h-[90vh] md:max-h-[900px] md:my-8 md:rounded-[3rem]",
          // Desktop: phone frame styling
          "md:shadow-device md:border-[12px] md:border-foreground/10 dark:md:border-foreground/5",
          "md:overflow-hidden md:ring-1 md:ring-border/50",
          className
        )}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Phone notch for desktop view */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 z-50">
          <div className="w-32 h-7 bg-foreground/10 dark:bg-foreground/5 rounded-b-2xl flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-foreground/20" />
            <div className="w-12 h-1 rounded-full bg-foreground/15" />
          </div>
        </div>

        {/* Inner content with proper scrolling */}
        <div className="h-full overflow-y-auto scrollbar-hide">
          {children}
        </div>

        {/* Phone home indicator for desktop view */}
        <div className="hidden md:flex absolute bottom-2 left-1/2 -translate-x-1/2 z-50">
          <div className="w-28 h-1 bg-foreground/20 rounded-full" />
        </div>
      </motion.div>

      {/* Decorative device reflection */}
      <div className="hidden md:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-32 bg-gradient-to-t from-primary/5 to-transparent blur-3xl opacity-50" />
    </div>
  );
};

export default MobileLayout;
