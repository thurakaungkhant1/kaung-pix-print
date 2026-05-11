import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/kaung-watermark.png";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

const LoadingScreen = ({ onLoadComplete }: LoadingScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onLoadComplete, 500);
    }, duration + 250);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onLoadComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden",
        "bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.25),_transparent_60%),radial-gradient(ellipse_at_bottom,_hsl(var(--primary)/0.15),_transparent_55%)]",
        "bg-background transition-all duration-500 ease-out",
        fadeOut ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Soft animated orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse-soft" />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-soft"
          style={{ animationDelay: "0.6s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background))_85%)]" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-7 px-6",
          "transition-all duration-700 ease-out",
          fadeOut ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
        )}
      >
        {/* Logo mark */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl animate-pulse-soft" />
          <div className="relative h-24 w-24 rounded-3xl bg-background/40 backdrop-blur-sm shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.5)] flex items-center justify-center ring-1 ring-border/40 overflow-hidden">
            <img src={logoUrl} alt="Kaung Computer" className="h-20 w-20 object-contain" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground">
            Kaung <span className="text-primary">Computer</span>
          </h1>
          <p className="text-[11px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground/80 font-medium">
            Photography · Printing · Digital
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-2 w-56 md:w-64">
          <div className="h-[3px] w-full rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 shadow-[0_0_12px_hsl(var(--primary)/0.7)] transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
            <span>Loading</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer brand line */}
      <div
        className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60",
          "transition-opacity duration-500",
          fadeOut ? "opacity-0" : "opacity-100"
        )}
      >
        Est. Myanmar
      </div>
    </div>
  );
};

export default LoadingScreen;
