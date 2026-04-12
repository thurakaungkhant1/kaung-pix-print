import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }
interface Target { id: number; x: number; y: number; size: number; }

const TargetShoot = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [targets, setTargets] = useState<Target[]>([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
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
      idRef.current++;
      const size = 30 + Math.random() * 30;
      setTargets(prev => [...prev.slice(-5), {
        id: idRef.current, x: Math.random() * 80 + 5, y: Math.random() * 80 + 5, size,
      }]);
    }, 800);
    return () => clearInterval(interval);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started || gameOver) return;
    const timeout = setInterval(() => {
      setTargets(prev => prev.slice(1));
    }, 2500);
    return () => clearInterval(timeout);
  }, [started, gameOver]);

  const hit = (id: number) => {
    setTargets(prev => prev.filter(t => t.id !== id));
    setScore(s => s + 10);
    setHits(h => h + 1);
  };

  const miss = () => {
    setMisses(m => m + 1);
    setScore(s => Math.max(0, s - 3));
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setTimeLeft(25); setTargets([]); setHits(0); setMisses(0); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎯</div>
      <h2 className="text-xl font-bold">Target Shoot</h2>
      <p className="text-sm text-muted-foreground">Hit the targets! Miss = -3 pts</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎯</div>
      <h2 className="text-xl font-bold">Time's Up!</h2>
      <p className="text-sm text-muted-foreground">Hits: {hits} | Misses: {misses}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, hits >= 15)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">🎯 {hits}</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <div className="relative w-full h-[300px] bg-gradient-to-b from-muted/30 to-muted/50 rounded-2xl overflow-hidden border border-border/50 cursor-crosshair"
        onClick={miss}>
        {targets.map(t => (
          <button key={t.id} onClick={e => { e.stopPropagation(); hit(t.id); }}
            className="absolute rounded-full bg-red-500 hover:bg-red-400 active:scale-75 transition-transform border-2 border-red-300 shadow-lg"
            style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.size, height: t.size, transform: "translate(-50%, -50%)" }}>
            <div className="absolute inset-1/4 rounded-full bg-red-300" />
            <div className="absolute inset-[40%] rounded-full bg-white" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TargetShoot;
