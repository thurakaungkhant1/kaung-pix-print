import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

const W = 300, H = 400, GRAVITY = 0.4, JUMP = -6, PIPE_W = 50, GAP = 120, PIPE_SPEED = 2;

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const FlappyBird = ({ onGameEnd }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const stateRef = useRef({ birdY: H / 2, vel: 0, pipes: [] as { x: number; topH: number; passed: boolean }[], score: 0, running: false });

  const reset = () => { stateRef.current = { birdY: H / 2, vel: 0, pipes: [], score: 0, running: true }; setScore(0); setGameOver(false); setRunning(true); };

  const jump = useCallback(() => { if (stateRef.current.running) stateRef.current.vel = JUMP; }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = () => { if (stateRef.current.running) jump(); };
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleClick(); });
    const handleKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); handleClick(); } };
    window.addEventListener("keydown", handleKey);
    return () => { canvas.removeEventListener("click", handleClick); window.removeEventListener("keydown", handleKey); };
  }, [jump]);

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const loop = () => {
      const s = stateRef.current;
      if (!s.running) return;
      s.vel += GRAVITY; s.birdY += s.vel;
      frame++;
      if (frame % 90 === 0) s.pipes.push({ x: W, topH: 50 + Math.random() * (H - GAP - 100), passed: false });
      s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
      s.pipes.forEach(p => { p.x -= PIPE_SPEED; if (!p.passed && p.x + PIPE_W < 40) { p.passed = true; s.score++; setScore(s.score); } });
      const birdX = 40, birdR = 12;
      if (s.birdY < 0 || s.birdY > H) { s.running = false; setRunning(false); setGameOver(true); onGameEnd(s.score * 10, s.score >= 5); return; }
      for (const p of s.pipes) {
        if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
          if (s.birdY - birdR < p.topH || s.birdY + birdR > p.topH + GAP) { s.running = false; setRunning(false); setGameOver(true); onGameEnd(s.score * 10, s.score >= 5); return; }
        }
      }
      // Draw - sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, "#87CEEB"); skyGrad.addColorStop(1, "#E0F4FF");
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
      // Ground
      ctx.fillStyle = "#8B7355"; ctx.fillRect(0, H - 20, W, 20);
      ctx.fillStyle = "#6B8E23"; ctx.fillRect(0, H - 25, W, 8);
      // Pipes
      s.pipes.forEach(p => {
        const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        pipeGrad.addColorStop(0, "#2E8B57"); pipeGrad.addColorStop(0.5, "#3CB371"); pipeGrad.addColorStop(1, "#2E8B57");
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(p.x, 0, PIPE_W, p.topH);
        ctx.fillRect(p.x, p.topH + GAP, PIPE_W, H);
        ctx.fillStyle = "#228B22";
        ctx.fillRect(p.x - 3, p.topH - 15, PIPE_W + 6, 15);
        ctx.fillRect(p.x - 3, p.topH + GAP, PIPE_W + 6, 15);
      });
      // Bird
      ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(birdX, s.birdY, birdR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFA500"; ctx.beginPath(); ctx.arc(birdX, s.birdY, birdR - 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(birdX + 4, s.birdY - 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(birdX + 5, s.birdY - 3, 2, 0, Math.PI * 2); ctx.fill();
      // Beak
      ctx.fillStyle = "#FF6347"; ctx.beginPath(); ctx.moveTo(birdX + birdR, s.birdY); ctx.lineTo(birdX + birdR + 8, s.birdY + 2); ctx.lineTo(birdX + birdR, s.birdY + 4); ctx.fill();
      // Score
      ctx.fillStyle = "white"; ctx.strokeStyle = "#333"; ctx.lineWidth = 3;
      ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
      ctx.strokeText(String(s.score), W / 2, 45); ctx.fillText(String(s.score), W / 2, 45);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [running]);

  return (
    <div className="flex flex-col items-center gap-4">
      {gameOver && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Badge variant={score >= 5 ? "default" : "secondary"} className="text-sm px-4 py-2">
            {score >= 5 ? "🎉 Great!" : "Game Over!"} Score: {score}
          </Badge>
        </motion.div>
      )}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl border-2 border-border/50 cursor-pointer shadow-sm" />
      {!running && (
        <div className="flex flex-col items-center gap-2">
          <Button onClick={reset} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "🎮 Start Game"}
          </Button>
          {!gameOver && <p className="text-xs text-muted-foreground">Tap or Space to jump!</p>}
        </div>
      )}
    </div>
  );
};

export default FlappyBird;
