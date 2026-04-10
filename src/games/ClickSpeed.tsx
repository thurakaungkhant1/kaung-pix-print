import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MousePointerClick, RotateCcw, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const ClickSpeed = ({ onGameEnd }: Props) => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const start = () => { setClicks(0); setTimeLeft(10); setRunning(true); setFinished(false); };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(intervalRef.current); setRunning(false); setFinished(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => { if (finished) onGameEnd(clicks, clicks >= 50); }, [finished]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Stats */}
      <div className="flex gap-3">
        <Card className="px-4 py-2.5 rounded-xl border-border/50 text-center">
          <p className="text-2xl font-display font-bold text-primary">{clicks}</p>
          <p className="text-[10px] text-muted-foreground">Clicks</p>
        </Card>
        <Card className="px-4 py-2.5 rounded-xl border-border/50 text-center">
          <p className="text-2xl font-display font-bold text-accent">{timeLeft}s</p>
          <p className="text-[10px] text-muted-foreground">Time Left</p>
        </Card>
        {finished && (
          <Card className="px-4 py-2.5 rounded-xl border-border/50 text-center">
            <p className="text-2xl font-display font-bold">{(clicks / 10).toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">CPS</p>
          </Card>
        )}
      </div>

      {running ? (
        <motion.button
          onClick={() => setClicks(c => c + 1)}
          whileTap={{ scale: 0.92 }}
          className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-4 border-primary/50
            hover:from-primary/30 hover:to-primary/20 active:border-primary
            transition-all flex flex-col items-center justify-center gap-2
            shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
        >
          <MousePointerClick className="h-12 w-12 text-primary" />
          <span className="text-primary font-display font-bold text-lg">TAP!</span>
        </motion.button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {finished && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="h-5 w-5 text-primary" />
                <p className="text-xl font-display font-bold">
                  {clicks >= 50 ? "🎉 Amazing!" : clicks >= 30 ? "👍 Good job!" : "Keep practicing!"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{clicks} clicks in 10 seconds</p>
            </motion.div>
          )}
          <Button onClick={start} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> {finished ? "Try Again" : "🎯 Start!"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClickSpeed;
