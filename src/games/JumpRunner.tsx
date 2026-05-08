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
      <div className="relative w-full h-[220px] rounded-2xl overflow-hidden border border-border/50 shadow-inner cursor-pointer"
        style={{ background: "linear-gradient(180deg, #fde68a 0%, #f59e0b 40%, #b45309 70%, #78350f 100%)", perspective: "400px" }}
        onClick={doJump}>
        {/* sun */}
        <div className="absolute rounded-full" style={{ width: 60, height: 60, top: 18, right: 30, background: "radial-gradient(circle, #fff7c4 0%, #fbbf24 60%, transparent 100%)", boxShadow: "0 0 40px #fbbf24" }} />
        {/* mountains */}
        <div className="absolute bottom-10 left-0 right-0 h-16 opacity-40"
          style={{ background: "linear-gradient(180deg, #4c1d95 0%, transparent 100%)", clipPath: "polygon(0 100%, 10% 40%, 25% 70%, 40% 20%, 55% 60%, 75% 35%, 90% 65%, 100% 30%, 100% 100%)" }} />
        {/* ground perspective */}
        <div className="absolute bottom-0 left-0 right-0 h-12"
          style={{ background: "linear-gradient(180deg, #4d7c0f 0%, #166534 100%)", transform: "perspective(300px) rotateX(45deg)", transformOrigin: "bottom" }} />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-900/60" />
        {/* player */}
        <div className="absolute text-4xl transition-all duration-100 drop-shadow-lg"
          style={{ left: "12%", bottom: `${20 + playerY}px`, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>🏃</div>
        {/* shadow */}
        <div className="absolute rounded-full bg-black/40 blur-sm"
          style={{ left: "12%", bottom: 14, width: 30, height: 6, transform: `translateX(-30%) scaleX(${1 - playerY / 120})` }} />
        {obstacles.map(o => (
          <div key={o.id} className="absolute text-3xl" style={{ left: `${o.x}%`, bottom: 18, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}>🌵</div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">Tap to jump!</p>
    </div>
  );
};

export default JumpRunner;
