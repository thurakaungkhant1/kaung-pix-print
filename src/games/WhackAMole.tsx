import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const WhackAMole = ({ onGameEnd }: Props) => {
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const moleTimer = useRef<NodeJS.Timeout>();
  const gameTimer = useRef<NodeJS.Timeout>();

  const start = () => {
    setScore(0);
    setTimeLeft(30);
    setRunning(true);
    setFinished(false);
    setMoles(Array(9).fill(false));
  };

  useEffect(() => {
    if (!running) return;
    gameTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    moleTimer.current = setInterval(() => {
      setMoles(() => {
        const n = Array(9).fill(false);
        const count = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < count; i++) {
          n[Math.floor(Math.random() * 9)] = true;
        }
        return n;
      });
    }, 800);
    return () => { clearInterval(gameTimer.current); clearInterval(moleTimer.current); };
  }, [running]);

  useEffect(() => {
    if (finished) onGameEnd(score, score >= 100);
  }, [finished]);

  const whack = (i: number) => {
    if (!running || !moles[i]) return;
    setScore(s => s + 10);
    setMoles(m => { const n = [...m]; n[i] = false; return n; });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-8">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{score}</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-accent">{timeLeft}s</p>
          <p className="text-xs text-muted-foreground">Time</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 w-fit">
        {moles.map((active, i) => (
          <button
            key={i}
            onClick={() => whack(i)}
            className={`w-20 h-20 rounded-2xl text-3xl flex items-center justify-center transition-all duration-200
              ${active
                ? "bg-accent/20 border-2 border-accent scale-110 shadow-[0_0_15px_hsl(var(--accent)/0.4)]"
                : "bg-card border-2 border-border/50 hover:bg-muted/50"
              } active:scale-90`}
          >
            {active ? "🐹" : "🕳️"}
          </button>
        ))}
      </div>

      {!running && (
        <div className="text-center">
          {finished && (
            <p className="text-lg font-bold mb-2">
              {score >= 100 ? "🎉 Amazing!" : score >= 50 ? "👍 Nice!" : "Keep trying!"}
            </p>
          )}
          <Button onClick={start} className="btn-neon gap-2">
            <RotateCcw className="h-4 w-4" /> {finished ? "Play Again" : "Start!"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WhackAMole;
