import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

const LoadingScreen = ({ onLoadComplete }: LoadingScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onLoadComplete, 600);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onLoadComplete]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-hero" />
          
          {/* Animated mesh gradient overlay */}
          <motion.div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 20% 30%, hsl(var(--primary) / 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 70%, hsl(var(--accent) / 0.1), transparent)
              `
            }}
            animate={{ 
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Floating orbs for desktop */}
          <motion.div 
            className="absolute top-1/4 -left-20 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary-foreground) / 0.1), transparent)' }}
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 -right-20 w-80 h-80 md:w-[500px] md:h-[500px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary-foreground) / 0.08), transparent)' }}
            animate={{ 
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[600px] md:h-[600px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary-foreground) / 0.05), transparent)' }}
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Sparkle particles for desktop */}
          <div className="hidden md:block">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-primary-foreground/30"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              >
                <Sparkles className="h-4 w-4 md:h-6 md:w-6" />
              </motion.div>
            ))}
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 md:gap-10">
            {/* Animated Logo Container */}
            <motion.div 
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Pulsing glow ring */}
              <motion.div 
                className="absolute inset-0 -m-8 md:-m-12 rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary-foreground) / 0.15), transparent 70%)' }}
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Logo text with gradient */}
              <motion.h1 
                className="relative text-4xl md:text-6xl lg:text-7xl font-display font-black text-primary-foreground tracking-tight"
                animate={{ 
                  textShadow: [
                    "0 0 20px hsl(var(--primary-foreground) / 0.3)",
                    "0 0 40px hsl(var(--primary-foreground) / 0.5)",
                    "0 0 20px hsl(var(--primary-foreground) / 0.3)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Kaung Computer
              </motion.h1>
            </motion.div>
            
            {/* Tagline with stagger */}
            <motion.div
              className="flex items-center gap-2 text-primary-foreground/70"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Zap className="h-4 w-4 md:h-5 md:w-5" />
              <p className="text-sm md:text-lg font-medium tracking-wide">
                Photography & Printing Services
              </p>
              <Zap className="h-4 w-4 md:h-5 md:w-5" />
            </motion.div>
            
            {/* Progress bar with glow */}
            <motion.div 
              className="relative w-48 md:w-64"
              initial={{ opacity: 0, scaleX: 0.8 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {/* Glow effect */}
              <div 
                className="absolute inset-0 blur-md transition-all duration-100"
                style={{ 
                  background: `linear-gradient(90deg, transparent, hsl(var(--primary-foreground) / 0.3) ${progress}%, transparent)`,
                  transform: 'scaleY(2)'
                }}
              />
              
              {/* Track */}
              <div className="relative h-1.5 md:h-2 bg-primary-foreground/20 rounded-full overflow-hidden backdrop-blur-sm">
                {/* Fill */}
                <motion.div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary-foreground) / 0.6), hsl(var(--primary-foreground) / 0.9))'
                  }}
                />
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, hsl(var(--primary-foreground) / 0.3), transparent)',
                    width: '50%'
                  }}
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              
              {/* Progress text */}
              <motion.p 
                className="text-center text-xs md:text-sm text-primary-foreground/60 mt-3 font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Loading... {Math.round(progress)}%
              </motion.p>
            </motion.div>
            
            {/* Loading dots with spring animation */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 md:w-3 md:h-3 bg-primary-foreground/60 rounded-full"
                  animate={{
                    y: [0, -10, 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom decorative line for desktop */}
          <motion.div 
            className="hidden md:block absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary-foreground) / 0.3), transparent)'
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;