import { lazy, Suspense } from "react";
import { WifiOff } from "lucide-react";
import { motion } from "framer-motion";

const SnakeGame = lazy(() => import("@/games/SnakeGame"));

const OfflineGame = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mt-8 mb-6 relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 backdrop-blur-sm border border-primary/20 mb-4 shadow-lg">
          <WifiOff className="w-9 h-9 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">
          အင်တာနက် မရှိပါ
        </h1>
        <p className="text-sm text-muted-foreground">No Internet — Play Snake while you wait 🐍</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative w-full max-w-md z-10"
      >
        <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden p-4">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading game...</p>
            </div>
          }>
            <SnakeGame onGameEnd={() => {}} />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
};

export default OfflineGame;
