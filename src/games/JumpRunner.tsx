import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }
interface Obstacle { id: number; x: number; gap: number; passed: boolean; }

const JumpRunner = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(2);
  const idRef = useRef(0);

  useEffect(() => {
    if (!started || gameOver) return;
    const jump = (e: KeyboardEvent) => { if (e.key === " " || e.key === "ArrowUp") doJump(); };
    window.addEventListener("keydown", jump);
    return () => window.removeEventListener("keydown", jump);
  }, [started, gameOver, jumping]);

  const doJump = () => {
    if (jumping) return;
    setJumping(true);
    setPlayerY(60);
    setTimeout(() => setPlayerY(30), 200);
    setTimeout(() => { setPlayerY(0); setJumping(false); }, 500);
  };

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setObstacles(prev => {
        let next = prev.map(o => ({ ...o, x: o.x - speed }));
        next.forEach(o => {
          if (!o.passed && o.x < 15) {
            if (playerY < 20) { setGameOver(true); return; }
            o.passed = true;
            setScore(s => {
              const ns = s + 5;
              if (ns % 25 === 0) setSpeed(sp => Math.min(sp + 0.3, 5));
              return ns;
            });
          }
        });
        next = next.filter(o => o.x > -10);
        if (next.length === 0 || next[next.length - 1].x < 60) {
          if (Math.random() < 0.3) {
            idRef.current++;
            next.push({ id: idRef.current, x: 105, gap: 0, passed: false });
          }
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [started, gameOver, speed, playerY]);

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setObstacles([]); setSpeed(2); setPlayerY(0); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🦘</div>
      <h2 className="text-xl font-bold">Jump Runner</h2>
      <p className="text-sm text-muted-foreground">Tap or press Space to jump over obstacles!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🦘</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 30)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Score: {score}</span>
      </div>
      <div className="relative w-full h-[200px] bg-gradient-to-b from-sky-100 to-amber-50 dark:from-sky-950/20 dark:to-amber-950/20 rounded-2xl overflow-hidden border border-border/50"
        onClick={doJump}>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-600/30" />
        <div className="absolute text-3xl transition-all duration-100"
          style={{ left: "12%", bottom: `${8 + playerY}px` }}>🏃</div>
        {obstacles.map(o => (
          <div key={o.id} className="absolute bottom-2 text-2xl" style={{ left: `${o.x}%` }}>🌵</div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">Tap to jump!</p>
    </div>
  );
};

export default JumpRunner;
