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
    
    // Background
    ctx.fillStyle = "hsl(var(--card))";
    ctx.fillRect(0, 0, size, size);
    
    // Grid dots (subtle)
    ctx.fillStyle = "hsl(var(--border) / 0.2)";
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Food (apple)
    ctx.fillStyle = "hsl(var(--accent))";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "hsl(var(--accent) / 0.3)";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 + 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Snake
    snake.forEach((s, i) => {
      const radius = i === 0 ? 4 : 3;
      ctx.fillStyle = i === 0 ? "hsl(var(--primary))" : `hsl(var(--primary) / ${0.8 - i * 0.02})`;
      const x = s.x * CELL + 1;
      const y = s.y * CELL + 1;
      const w = CELL - 2;
      const h = CELL - 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
    });
  }, [snake, food]);

  const handleDirection = (d: Dir) => {
    const opposite: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (d !== opposite[dirRef.current]) { dirRef.current = d; setDir(d); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
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
        className="rounded-2xl border-2 border-border/50 shadow-sm"
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
