import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
      setTimeout(onLoadComplete, 400);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onLoadComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-gradient-hero transition-all duration-500",
        fadeOut ? "opacity-0 scale-105" : "opacity-100 scale-100"
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-foreground/3 rounded-full blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo/Brand */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary-foreground/10 rounded-3xl blur-2xl animate-pulse-soft" />
          <h1 className="relative text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground tracking-tight">
            Kaung Computer
          </h1>
        </div>
        
        {/* Tagline */}
        <p className="text-primary-foreground/70 text-sm md:text-base font-medium tracking-wide animate-fade-in">
          Photography & Printing Services
        </p>
        
        {/* Progress bar */}
        <div className="w-48 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-foreground/80 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce-soft"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;