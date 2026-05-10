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

      {/* Mole Grid — 3D holes */}
      <div
        className="grid grid-cols-3 gap-3 w-full max-w-[420px] p-4 rounded-3xl"
        style={{
          background: "linear-gradient(180deg, #84cc16 0%, #4d7c0f 50%, #365314 100%)",
          boxShadow: "inset 0 4px 10px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.25)",
          perspective: "500px",
        }}
      >
        {moles.map((active, i) => (
          <motion.button
            key={i}
            onClick={() => whack(i)}
            whileTap={{ scale: 0.85 }}
            className="relative aspect-square rounded-full overflow-hidden flex items-end justify-center"
            style={{
              background: "radial-gradient(ellipse at 50% 35%, #1c1917 0%, #292524 50%, #44403c 100%)",
              boxShadow: "inset 0 6px 12px rgba(0,0,0,0.7), inset 0 -2px 4px rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {/* dirt rim */}
            <div className="absolute inset-x-0 top-0 h-2 rounded-t-full" style={{ background: "linear-gradient(180deg, #92400e 0%, transparent 100%)" }} />
            {/* mole pops up */}
            <motion.span
              animate={active ? { y: 0, scale: 1 } : { y: "70%", scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="text-4xl pb-1"
              style={{ filter: active ? "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" : "none" }}
            >
              🐹
            </motion.span>
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
