import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";

const W = 300, H = 400, LANES = 3, CAR_W = 40, CAR_H = 60;

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const CarDodge = ({ onGameEnd }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const stateRef = useRef({
    lane: 1,
    obstacles: [] as { lane: number; y: number }[],
    score: 0,
    speed: 3,
    running: false,
  });

  const reset = () => {
    stateRef.current = { lane: 1, obstacles: [], score: 0, speed: 3, running: true };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  const moveLane = useCallback((dir: -1 | 1) => {
    const s = stateRef.current;
    s.lane = Math.max(0, Math.min(LANES - 1, s.lane + dir));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") moveLane(-1);
      if (e.key === "ArrowRight") moveLane(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveLane]);

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;

    const laneX = (l: number) => (W / LANES) * l + (W / LANES - CAR_W) / 2;

    const loop = () => {
      const s = stateRef.current;
      if (!s.running) return;

      frame++;
      s.speed = 3 + Math.floor(s.score / 100) * 0.5;

      if (frame % Math.max(20, 40 - Math.floor(s.score / 50)) === 0) {
        s.obstacles.push({ lane: Math.floor(Math.random() * LANES), y: -CAR_H });
      }

      s.obstacles.forEach(o => { o.y += s.speed; });
      s.obstacles = s.obstacles.filter(o => {
        if (o.y > H) { s.score += 10; setScore(s.score); return false; }
        return true;
      });

      // Collision
      const playerX = laneX(s.lane);
      const playerY = H - CAR_H - 20;
      for (const o of s.obstacles) {
        const ox = laneX(o.lane);
        if (Math.abs(playerX - ox) < CAR_W && Math.abs(playerY - o.y) < CAR_H) {
          s.running = false;
          setRunning(false);
          setGameOver(true);
          onGameEnd(s.score, s.score >= 100);
          return;
        }
      }

      // Draw
      ctx.fillStyle = "hsl(220, 15%, 20%)";
      ctx.fillRect(0, 0, W, H);

      // Road lines
      for (let i = 1; i < LANES; i++) {
        const x = (W / LANES) * i;
        for (let y = (frame * s.speed) % 40 - 40; y < H; y += 40) {
          ctx.fillStyle = "hsl(50, 80%, 60%)";
          ctx.fillRect(x - 1, y, 2, 20);
        }
      }

      // Obstacles
      s.obstacles.forEach(o => {
        ctx.fillStyle = "hsl(0, 70%, 50%)";
        const ox = laneX(o.lane);
        ctx.fillRect(ox, o.y, CAR_W, CAR_H);
        ctx.fillStyle = "hsl(0, 70%, 40%)";
        ctx.fillRect(ox + 5, o.y + 5, CAR_W - 10, 15);
      });

      // Player
      ctx.fillStyle = "hsl(var(--primary))";
      ctx.fillRect(playerX, playerY, CAR_W, CAR_H);
      ctx.fillStyle = "hsl(var(--primary) / 0.7)";
      ctx.fillRect(playerX + 5, playerY + 5, CAR_W - 10, 15);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [running]);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-bold text-primary">Score: {score}</p>
      {gameOver && <p className="font-bold text-accent">{score >= 100 ? "🎉 Amazing!" : "Game Over!"}</p>}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border-2 border-border/50" />
      <div className="flex gap-3 md:hidden">
        <Button size="icon" variant="outline" onClick={() => moveLane(-1)} className="h-14 w-14"><ArrowLeft className="h-6 w-6" /></Button>
        <Button size="icon" variant="outline" onClick={() => moveLane(1)} className="h-14 w-14"><ArrowRight className="h-6 w-6" /></Button>
      </div>
      {!running && (
        <Button onClick={reset} className="btn-neon gap-2">
          <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "Start Game"}
        </Button>
      )}
    </div>
  );
};

export default CarDodge;
