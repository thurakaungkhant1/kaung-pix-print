import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const WhackAMole = ({ onGameEnd }: Props) => {
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const moleTimer = useRef<ReturnType<typeof setInterval>>();
  const gameTimer = useRef<ReturnType<typeof setInterval>>();

  const start = () => { setScore(0); setTimeLeft(30); setRunning(true); setFinished(false); setMoles(Array(9).fill(false)); };

  useEffect(() => {
    if (!running) return;
    gameTimer.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { setRunning(false); setFinished(true); return 0; } return t - 1; });
    }, 1000);
    moleTimer.current = setInterval(() => {
      setMoles(() => {
        const n = Array(9).fill(false);
        const count = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < count; i++) n[Math.floor(Math.random() * 9)] = true;
        return n;
      });
    }, 800);
    return () => { clearInterval(gameTimer.current); clearInterval(moleTimer.current); };
  }, [running]);

  useEffect(() => { if (finished) onGameEnd(score, score >= 100); }, [finished]);

  const whack = (i: number) => {
    if (!running || !moles[i]) return;
    setScore(s => s + 10);
    setMoles(m => { const n = [...m]; n[i] = false; return n; });
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Stats */}
      <div className="flex gap-3">
        <Card className="px-4 py-2 rounded-xl border-border/50 text-center">
          <p className="text-xl font-display font-bold text-primary">{score}</p>
          <p className="text-[10px] text-muted-foreground">Score</p>
        </Card>
        <Card className="px-4 py-2 rounded-xl border-border/50 text-center">
          <p className="text-xl font-display font-bold text-accent">{timeLeft}s</p>
          <p className="text-[10px] text-muted-foreground">Time Left</p>
        </Card>
      </div>

      {/* Mole Grid */}
      <div className="grid grid-cols-3 gap-3 w-fit">
        {moles.map((active, i) => (
          <motion.button
            key={i}
            onClick={() => whack(i)}
            whileTap={{ scale: 0.85 }}
            animate={active ? { scale: [0.8, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`w-20 h-20 rounded-2xl text-3xl flex items-center justify-center transition-colors duration-200
              ${active
                ? "bg-accent/15 border-2 border-accent shadow-[0_0_20px_hsl(var(--accent)/0.3)] cursor-pointer"
                : "bg-card border-2 border-border/50"
              }`}
          >
            {active ? "🐹" : "🕳️"}
          </motion.button>
        ))}
      </div>

      {!running && (
        <div className="text-center space-y-3">
          {finished && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-lg font-display font-bold">
                {score >= 100 ? "🎉 Amazing!" : score >= 50 ? "👍 Nice!" : "Keep trying!"}
              </p>
            </motion.div>
          )}
          <Button onClick={start} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> {finished ? "Play Again" : "🎯 Start!"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WhackAMole;
