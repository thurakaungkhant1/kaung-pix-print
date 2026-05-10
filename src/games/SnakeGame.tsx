import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

const GRID = 15;
const CELL = 20;
const SPEED = 150;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const SnakeGame = ({ onGameEnd }: Props) => {
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Point>({ x: 3, y: 3 });
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const dirRef = useRef<Dir>("RIGHT");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const randomFood = useCallback((s: Point[]): Point => {
    let p: Point;
    do { p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
    while (s.some(seg => seg.x === p.x && seg.y === p.y));
    return p;
  }, []);

  const reset = () => {
    const initial = [{ x: 7, y: 7 }];
    setSnake(initial); setFood(randomFood(initial));
    setDir("RIGHT"); dirRef.current = "RIGHT";
    setGameOver(false); setScore(0); setRunning(true);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" };
      const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      const newDir = map[e.key];
      if (newDir && newDir !== opposite[dirRef.current]) { dirRef.current = newDir; setDir(newDir); e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const interval = setInterval(() => {
      setSnake(prev => {
        const head = { ...prev[0] };
        const d = dirRef.current;
        if (d === "UP") head.y--; if (d === "DOWN") head.y++;
        if (d === "LEFT") head.x--; if (d === "RIGHT") head.x++;
        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
          prev.some(s => s.x === head.x && s.y === head.y)) {
          setGameOver(true); setRunning(false); onGameEnd(score, score >= 50); return prev;
        }
        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) { setScore(s => s + 10); setFood(randomFood(newSnake)); }
        else { newSnake.pop(); }
        return newSnake;
      });
    }, SPEED);
    return () => clearInterval(interval);
  }, [running, gameOver, food, score]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const size = GRID * CELL;

    // Gradient background (3D feel)
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, "#0f172a"); bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Checkered grass tiles
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.03)";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Apple with glow + highlight
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, CELL);
    glow.addColorStop(0, "rgba(239,68,68,0.45)"); glow.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(fx, fy, CELL, 0, Math.PI * 2); ctx.fill();
    const apple = ctx.createRadialGradient(fx - 3, fy - 3, 1, fx, fy, CELL / 2);
    apple.addColorStop(0, "#fecaca"); apple.addColorStop(0.4, "#ef4444"); apple.addColorStop(1, "#991b1b");
    ctx.fillStyle = apple; ctx.beginPath(); ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2); ctx.fill();
    // leaf
    ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.ellipse(fx + 2, fy - CELL / 2 + 1, 3, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();

    // Snake — segments with radial gradient + drop shadow
    snake.forEach((s, i) => {
      const x = s.x * CELL + CELL / 2;
      const y = s.y * CELL + CELL / 2;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.arc(x + 1, y + 2, CELL / 2 - 1.5, 0, Math.PI * 2); ctx.fill();
      // body gradient
      const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, CELL / 2);
      if (i === 0) { grad.addColorStop(0, "#bbf7d0"); grad.addColorStop(0.5, "#22c55e"); grad.addColorStop(1, "#14532d"); }
      else { grad.addColorStop(0, "#86efac"); grad.addColorStop(0.6, "#16a34a"); grad.addColorStop(1, "#14532d"); }
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, CELL / 2 - 1.5, 0, Math.PI * 2); ctx.fill();
      // head eyes
      if (i === 0) {
        const d = dirRef.current;
        const ox = d === "LEFT" ? -3 : d === "RIGHT" ? 3 : 0;
        const oy = d === "UP" ? -3 : d === "DOWN" ? 3 : 0;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x - 3 + ox, y - 2 + oy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3 + ox, y - 2 + oy, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(x - 3 + ox, y - 2 + oy, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 3 + ox, y - 2 + oy, 1, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, [snake, food]);

  const handleDirection = (d: Dir) => {
    const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (d !== opposite[dirRef.current]) { dirRef.current = d; setDir(d); }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Score display */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm px-3 py-1.5 font-display">
          🍎 Score: <span className="font-bold text-primary ml-1">{score}</span>
        </Badge>
        {gameOver && (
          <Badge variant={score >= 50 ? "default" : "secondary"} className="text-sm px-3 py-1.5">
            {score >= 50 ? "🎉 Great job!" : "Game Over!"}
          </Badge>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="rounded-2xl border-2 border-border/50 shadow-xl w-full max-w-[460px] h-auto"
        style={{ aspectRatio: "1 / 1", imageRendering: "auto" }}
      />

      {/* Mobile D-pad */}
      <div className="grid grid-cols-3 gap-1.5 w-fit md:hidden">
        <div />
        <Button size="icon" variant="outline" onClick={() => handleDirection("UP")} className="h-12 w-12 rounded-xl"><ArrowUp /></Button>
        <div />
        <Button size="icon" variant="outline" onClick={() => handleDirection("LEFT")} className="h-12 w-12 rounded-xl"><ArrowLeft /></Button>
        <Button size="icon" variant="outline" onClick={() => handleDirection("DOWN")} className="h-12 w-12 rounded-xl"><ArrowDown /></Button>
        <Button size="icon" variant="outline" onClick={() => handleDirection("RIGHT")} className="h-12 w-12 rounded-xl"><ArrowRight /></Button>
      </div>

      {!running && (
        <Button onClick={reset} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "🎮 Start Game"}
        </Button>
      )}
    </div>
  );
};

export default SnakeGame;
