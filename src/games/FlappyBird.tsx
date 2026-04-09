import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const W = 300, H = 400, GRAVITY = 0.4, JUMP = -6, PIPE_W = 50, GAP = 120, PIPE_SPEED = 2;

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const FlappyBird = ({ onGameEnd }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const stateRef = useRef({ birdY: H / 2, vel: 0, pipes: [] as { x: number; topH: number; passed: boolean }[], score: 0, running: false });

  const reset = () => {
    stateRef.current = { birdY: H / 2, vel: 0, pipes: [], score: 0, running: true };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  const jump = useCallback(() => {
    if (!stateRef.current.running) return;
    stateRef.current.vel = JUMP;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = () => {
      if (stateRef.current.running) jump();
    };
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleClick(); });

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handleClick(); }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      canvas.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [jump]);

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const loop = () => {
      const s = stateRef.current;
      if (!s.running) return;

      // Physics
      s.vel += GRAVITY;
      s.birdY += s.vel;

      // Pipes
      frame++;
      if (frame % 90 === 0) {
        const topH = 50 + Math.random() * (H - GAP - 100);
        s.pipes.push({ x: W, topH, passed: false });
      }

      s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
      s.pipes.forEach(p => {
        p.x -= PIPE_SPEED;
        if (!p.passed && p.x + PIPE_W < 40) {
          p.passed = true;
          s.score++;
          setScore(s.score);
        }
      });

      // Collision
      const birdX = 40, birdR = 12;
      if (s.birdY < 0 || s.birdY > H) {
        s.running = false;
        setRunning(false);
        setGameOver(true);
        onGameEnd(s.score * 10, s.score >= 5);
        return;
      }
      for (const p of s.pipes) {
        if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
          if (s.birdY - birdR < p.topH || s.birdY + birdR > p.topH + GAP) {
            s.running = false;
            setRunning(false);
            setGameOver(true);
            onGameEnd(s.score * 10, s.score >= 5);
            return;
          }
        }
      }

      // Draw
      ctx.fillStyle = "hsl(200, 40%, 92%)";
      ctx.fillRect(0, 0, W, H);

      // Pipes
      s.pipes.forEach(p => {
        ctx.fillStyle = "hsl(var(--primary))";
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.fillRect(p.x, p.topH + GAP, PIPE_W, H);
        ctx.fillStyle = "hsl(var(--primary) / 0.7)";
        ctx.fillRect(p.x - 3, p.topH - 15, PIPE_W + 6, 15);
        ctx.fillRect(p.x - 3, p.topH + GAP, PIPE_W + 6, 15);
      });

      // Bird
      ctx.fillStyle = "hsl(var(--accent))";
      ctx.beginPath();
      ctx.arc(birdX, s.birdY, birdR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(birdX + 4, s.birdY - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(birdX + 5, s.birdY - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Score
      ctx.fillStyle = "#333";
      ctx.font = "bold 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(s.score), W / 2, 40);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [running]);

  return (
    <div className="flex flex-col items-center gap-4">
      {gameOver && <p className="text-lg font-bold">{score >= 5 ? "🎉 Great!" : "Try again!"} Score: {score}</p>}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border-2 border-border/50 cursor-pointer" />
      {!running && (
        <Button onClick={reset} className="btn-neon gap-2">
          <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "Start Game"}
        </Button>
      )}
      {!running && !gameOver && <p className="text-sm text-muted-foreground">Tap or Space to jump!</p>}
    </div>
  );
};

export default FlappyBird;
