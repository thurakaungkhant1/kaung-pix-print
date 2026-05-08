import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }
interface FallingItem { id: number; x: number; y: number; type: "good" | "bad"; emoji: string; }

const GOOD = ["🍎","🍊","🍇","🍓","🥝","🍌"];
const BAD = ["💀","🔥","⚡","💣"];

const FruitCatch = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [basketX, setBasketX] = useState(50);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    if (!started || gameOver) return;
    const handleMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const pct = (touch.clientX / window.innerWidth) * 100;
      setBasketX(Math.max(10, Math.min(90, pct)));
    };
    const handleMouse = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      if (!target) return;
      const rect = document.querySelector('.fruit-area')?.getBoundingClientRect();
      if (rect) setBasketX(Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    window.addEventListener("touchmove", handleMove);
    document.querySelector('.fruit-area')?.addEventListener("mousemove", handleMouse as any);
    return () => {
      window.removeEventListener("touchmove", handleMove);
      document.querySelector('.fruit-area')?.removeEventListener("mousemove", handleMouse as any);
    };
  }, [started, gameOver]);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setItems(prev => {
        const next = prev.map(i => ({ ...i, y: i.y + 2 }));
        const caught = next.filter(i => i.y >= 85 && Math.abs(i.x - basketX) < 12);
        caught.forEach(c => {
          if (c.type === "good") setScore(s => s + 5);
          else setLives(l => { const n = l - 1; if (n <= 0) setGameOver(true); return Math.max(0, n); });
        });
        const remaining = next.filter(i => i.y < 100 && !caught.includes(i));
        if (Math.random() < 0.15) {
          idRef.current++;
          const isBad = Math.random() < 0.2;
          remaining.push({
            id: idRef.current, x: Math.random() * 80 + 10, y: 0,
            type: isBad ? "bad" : "good",
            emoji: isBad ? BAD[Math.floor(Math.random() * BAD.length)] : GOOD[Math.floor(Math.random() * GOOD.length)],
          });
        }
        return remaining;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [started, gameOver, basketX]);

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setLives(3); setItems([]); setBasketX(50); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧺</div>
      <h2 className="text-xl font-bold">Fruit Catch</h2>
      <p className="text-sm text-muted-foreground">Move basket to catch fruits! Avoid skulls!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧺</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 40)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm">{"❤️".repeat(lives)}</span>
      </div>
      <div className="fruit-area relative w-full h-[300px] rounded-2xl overflow-hidden border border-border/50 cursor-none shadow-inner"
        style={{ background: "linear-gradient(180deg, #93c5fd 0%, #bbf7d0 60%, #16a34a 100%)" }}>
        {/* clouds */}
        <div className="absolute top-4 left-8 w-16 h-5 bg-white/70 rounded-full blur-sm" />
        <div className="absolute top-10 right-12 w-20 h-6 bg-white/60 rounded-full blur-sm" />
        {/* ground perspective */}
        <div className="absolute bottom-0 left-0 right-0 h-10"
          style={{ background: "linear-gradient(180deg, #16a34a 0%, #052e16 100%)", transform: "perspective(400px) rotateX(50deg)", transformOrigin: "bottom" }} />
        {items.map(i => (
          <div key={i.id} className="absolute text-3xl" style={{ left: `${i.x}%`, top: `${i.y}%`, transform: "translate(-50%, -50%)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
            {i.emoji}
          </div>
        ))}
        {/* basket shadow */}
        <div className="absolute rounded-full bg-black/40 blur-md" style={{ left: `${basketX}%`, bottom: "3%", width: 50, height: 8, transform: "translateX(-50%)" }} />
        <div className="absolute text-4xl transition-all duration-75" style={{ left: `${basketX}%`, bottom: "5%", transform: "translateX(-50%)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>🧺</div>
      </div>
    </div>
  );
};

export default FruitCatch;
