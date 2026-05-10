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
      // Realistic car renderer (top-down with depth)
      const drawCar = (x: number, y: number, color: string, accent: string) => {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        drawRoundRect(x + 3, y + 5, CAR_W, CAR_H, 8);
        // Body gradient
        const bodyGrad = ctx.createLinearGradient(x, y, x + CAR_W, y);
        bodyGrad.addColorStop(0, accent); bodyGrad.addColorStop(0.5, color); bodyGrad.addColorStop(1, accent);
        ctx.fillStyle = bodyGrad; drawRoundRect(x, y, CAR_W, CAR_H, 8);
        // Hood line
        ctx.fillStyle = "rgba(255,255,255,0.08)"; drawRoundRect(x + 3, y + 3, CAR_W - 6, CAR_H - 6, 6);
        // Windshield
        ctx.fillStyle = "rgba(20,30,50,0.85)"; drawRoundRect(x + 6, y + 8, CAR_W - 12, 14, 4);
        // Rear window
        ctx.fillStyle = "rgba(20,30,50,0.7)"; drawRoundRect(x + 6, y + CAR_H - 20, CAR_W - 12, 10, 4);
        // Roof highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x + 8, y + 24, CAR_W - 16, 2);
        // Wheels
        ctx.fillStyle = "#111"; drawRoundRect(x - 2, y + 8, 5, 12, 2); drawRoundRect(x + CAR_W - 3, y + 8, 5, 12, 2);
        drawRoundRect(x - 2, y + CAR_H - 20, 5, 12, 2); drawRoundRect(x + CAR_W - 3, y + CAR_H - 20, 5, 12, 2);
        // Headlights
        ctx.fillStyle = "#fff8c4"; ctx.beginPath(); ctx.arc(x + 8, y + 4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + CAR_W - 8, y + 4, 2.5, 0, Math.PI * 2); ctx.fill();
        // Taillights
        ctx.fillStyle = "#ff3b3b"; ctx.fillRect(x + 5, y + CAR_H - 4, 6, 2); ctx.fillRect(x + CAR_W - 11, y + CAR_H - 4, 6, 2);
      };
      s.obstacles.forEach(o => drawCar(laneX(o.lane), o.y, "#c0392b", "#e74c3c"));
      drawCar(playerX, playerY, "#2980b9", "#3498db");
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
      <canvas ref={canvasRef} width={W} height={H} className="rounded-2xl border-2 border-border/50 shadow-xl w-full max-w-[360px] h-auto" style={{ aspectRatio: `${W} / ${H}` }} />
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
