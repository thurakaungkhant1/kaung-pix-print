import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const W = 300, H = 400, LANES = 3, CAR_W = 40, CAR_H = 60;

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const CarDodge = ({ onGameEnd }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const stateRef = useRef({ lane: 1, obstacles: [] as { lane: number; y: number }[], score: 0, speed: 3, running: false });

  const reset = () => { stateRef.current = { lane: 1, obstacles: [], score: 0, speed: 3, running: true }; setScore(0); setGameOver(false); setRunning(true); };

  const moveLane = useCallback((dir: -1 | 1) => {
    stateRef.current.lane = Math.max(0, Math.min(LANES - 1, stateRef.current.lane + dir));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") moveLane(-1); if (e.key === "ArrowRight") moveLane(1); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moveLane]);

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const laneX = (l: number) => (W / LANES) * l + (W / LANES - CAR_W) / 2;

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    const loop = () => {
      const s = stateRef.current;
      if (!s.running) return;
      frame++; s.speed = 3 + Math.floor(s.score / 100) * 0.5;
      if (frame % Math.max(20, 40 - Math.floor(s.score / 50)) === 0) s.obstacles.push({ lane: Math.floor(Math.random() * LANES), y: -CAR_H });
      s.obstacles.forEach(o => { o.y += s.speed; });
      s.obstacles = s.obstacles.filter(o => { if (o.y > H) { s.score += 10; setScore(s.score); return false; } return true; });
      const playerX = laneX(s.lane), playerY = H - CAR_H - 20;
      for (const o of s.obstacles) {
        if (Math.abs(laneX(o.lane) - playerX) < CAR_W && Math.abs(playerY - o.y) < CAR_H) {
          s.running = false; setRunning(false); setGameOver(true); onGameEnd(s.score, s.score >= 100); return;
        }
      }
      // Draw road
      const roadGrad = ctx.createLinearGradient(0, 0, 0, H);
      roadGrad.addColorStop(0, "#1a1a2e"); roadGrad.addColorStop(1, "#16213e");
      ctx.fillStyle = roadGrad; ctx.fillRect(0, 0, W, H);
      // Lane lines
      for (let i = 1; i < LANES; i++) {
        const x = (W / LANES) * i;
        for (let y = (frame * s.speed) % 40 - 40; y < H; y += 40) {
          ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 1, y, 2, 20);
        }
      }
      // Road edges
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
      // Obstacles
      s.obstacles.forEach(o => {
        const ox = laneX(o.lane);
        ctx.fillStyle = "#e74c3c"; drawRoundRect(ox, o.y, CAR_W, CAR_H, 6);
        ctx.fillStyle = "#c0392b"; drawRoundRect(ox + 5, o.y + 5, CAR_W - 10, 15, 3);
        ctx.fillStyle = "#e74c3c77"; drawRoundRect(ox + 8, o.y + CAR_H - 15, CAR_W - 16, 8, 2);
      });
      // Player car
      ctx.fillStyle = "#3498db"; drawRoundRect(playerX, playerY, CAR_W, CAR_H, 6);
      ctx.fillStyle = "#2980b9"; drawRoundRect(playerX + 5, playerY + 5, CAR_W - 10, 15, 3);
      ctx.fillStyle = "#3498db77"; drawRoundRect(playerX + 8, playerY + CAR_H - 15, CAR_W - 16, 8, 2);
      // Headlights
      ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.arc(playerX + 8, playerY + CAR_H - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(playerX + CAR_W - 8, playerY + CAR_H - 3, 3, 0, Math.PI * 2); ctx.fill();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [running]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Badge variant="secondary" className="text-sm px-4 py-1.5 font-display">
        🏎️ Score: <span className="font-bold text-primary ml-1">{score}</span>
      </Badge>
      {gameOver && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Badge variant={score >= 100 ? "default" : "secondary"} className="text-sm px-4 py-1.5">
            {score >= 100 ? "🎉 Amazing!" : "Game Over!"}
          </Badge>
        </motion.div>
      )}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl border-2 border-border/50 shadow-sm" />
      <div className="flex gap-3 md:hidden">
        <Button size="icon" variant="outline" onClick={() => moveLane(-1)} className="h-14 w-14 rounded-xl"><ArrowLeft className="h-6 w-6" /></Button>
        <Button size="icon" variant="outline" onClick={() => moveLane(1)} className="h-14 w-14 rounded-xl"><ArrowRight className="h-6 w-6" /></Button>
      </div>
      {!running && (
        <Button onClick={reset} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <RotateCcw className="h-4 w-4" /> {gameOver ? "Play Again" : "🎮 Start Game"}
        </Button>
      )}
    </div>
  );
};

export default CarDodge;
