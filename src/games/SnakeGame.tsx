import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
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
    setSnake(initial);
    setFood(randomFood(initial));
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setRunning(true);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" };
      const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      const newDir = map[e.key];
      if (newDir && newDir !== opposite[dirRef.current]) {
        dirRef.current = newDir;
        setDir(newDir);
        e.preventDefault();
      }
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
        if (d === "UP") head.y--;
        if (d === "DOWN") head.y++;
        if (d === "LEFT") head.x--;
        if (d === "RIGHT") head.x++;

        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID ||
          prev.some(s => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          setRunning(false);
          onGameEnd(score, score >= 50);
          return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          setFood(randomFood(newSnake));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, SPEED);
    return () => clearInterval(interval);
  }, [running, gameOver, food, score]);

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const size = GRID * CELL;
    ctx.fillStyle = "hsl(var(--card))";
    ctx.fillRect(0, 0, size, size);
    // Grid
    ctx.strokeStyle = "hsl(var(--border) / 0.3)";
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(size, i * CELL); ctx.stroke();
    }
    // Food
    ctx.fillStyle = "hsl(var(--accent))";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, [snake, food]);

  const handleDirection = (d: Dir) => {
    const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (d !== opposite[dirRef.current]) { dirRef.current = d; setDir(d); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-lg font-bold text-primary">Score: {score}</p>
        {gameOver && <p className="text-sm text-accent font-medium">Game Over! {score >= 50 ? "🎉 Great job!" : "Try again!"}</p>}
      </div>
      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="rounded-xl border-2 border-border/50"
      />
      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 w-fit md:hidden">
        <div />
        <Button size="icon" variant="outline" onClick={() => handleDirection("UP")} className="h-12 w-12"><ArrowUp /></Button>
        <div />
        <Button size="icon" variant="outline" onClick={() => handleDirection("LEFT")} className="h-12 w-12"><ArrowLeft /></Button>
        <Button size="icon" variant="outline" onClick={() => handleDirection("DOWN")} className="h-12 w-12"><ArrowDown /></Button>
        <Button size="icon" variant="outline" onClick={() => handleDirection("RIGHT")} className="h-12 w-12"><ArrowRight /></Button>
      </div>
      {!running && (
        <Button onClick={reset} className="btn-neon gap-2">
          <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "Start Game"}
        </Button>
      )}
    </div>
  );
};

export default SnakeGame;
