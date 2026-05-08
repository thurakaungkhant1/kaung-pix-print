import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }
interface Bubble { id: number; x: number; y: number; size: number; color: string; speed: number; }

const COLORS = ["#ef4444","#3b82f6","#22c55e","#eab308","#a855f7","#ec4899","#f97316"];

const BubblePop = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setBubbles(prev => {
        const next = prev.map(b => ({ ...b, y: b.y - b.speed })).filter(b => b.y > -50);
        if (Math.random() < 0.4) {
          idRef.current++;
          next.push({
            id: idRef.current, x: Math.random() * 80 + 10, y: 100,
            size: 30 + Math.random() * 30, color: COLORS[Math.floor(Math.random() * COLORS.length)],
            speed: 0.5 + Math.random() * 1.5,
          });
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [started, gameOver]);

  const pop = (id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setScore(s => s + 5);
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setTimeLeft(30); setBubbles([]); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🫧</div>
      <h2 className="text-xl font-bold">Bubble Pop</h2>
      <p className="text-sm text-muted-foreground">Pop as many bubbles as you can in 30 seconds!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🫧</div>
      <h2 className="text-xl font-bold">Time's Up!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 50)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <div className="relative w-full h-[300px] rounded-2xl overflow-hidden border border-border/50 shadow-inner"
        style={{ background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0c1e4a 60%, #050a1f 100%)" }}>
        {/* underwater rays */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "repeating-linear-gradient(75deg, transparent 0 40px, rgba(255,255,255,0.06) 40px 80px)" }} />
        {bubbles.map(b => (
          <button key={b.id} onClick={() => pop(b.id)}
            className="absolute rounded-full transition-transform hover:scale-110 active:scale-50 cursor-pointer"
            style={{
              left: `${b.x}%`, bottom: `${b.y}%`, width: b.size, height: b.size,
              transform: "translateX(-50%)",
              background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, ${b.color}dd 35%, ${b.color} 70%, rgba(0,0,0,0.4) 100%)`,
              boxShadow: `inset -6px -8px 16px rgba(0,0,0,0.35), inset 4px 6px 12px rgba(255,255,255,0.45), 0 4px 12px rgba(0,0,0,0.4)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BubblePop;
