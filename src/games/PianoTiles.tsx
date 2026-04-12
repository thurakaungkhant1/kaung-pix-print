import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }
interface Tile { id: number; x: number; lane: number; }

const PianoTiles = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(2);
  const idRef = { current: 0 };

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setTiles(prev => {
        const next = prev.map(t => ({ ...t, x: t.x + speed })).filter(t => {
          if (t.x > 100) { setGameOver(true); return false; }
          return true;
        });
        if (Math.random() < 0.3 || next.length === 0) {
          idRef.current++;
          next.push({ id: idRef.current, x: -10, lane: Math.floor(Math.random() * 4) });
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [started, gameOver, speed]);

  const tap = (lane: number) => {
    const tile = tiles.find(t => t.lane === lane && t.x >= 40 && t.x <= 80);
    if (tile) {
      setTiles(prev => prev.filter(t => t.id !== tile.id));
      const pts = score + 5;
      setScore(pts);
      if (pts % 50 === 0) setSpeed(s => Math.min(s + 0.5, 6));
    }
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setTiles([]); setSpeed(2); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎹</div>
      <h2 className="text-xl font-bold">Piano Tiles</h2>
      <p className="text-sm text-muted-foreground">Tap the black tiles before they pass!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎹</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
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
      </div>
      <div className="relative h-[300px] rounded-2xl overflow-hidden border border-border/50">
        {[0,1,2,3].map(lane => (
          <button key={lane} onClick={() => tap(lane)}
            className="absolute h-full w-1/4 border-r border-border/20 hover:bg-muted/30 active:bg-muted/50 transition-colors"
            style={{ left: `${lane * 25}%` }}>
            {tiles.filter(t => t.lane === lane).map(t => (
              <div key={t.id}
                className="absolute w-[90%] h-14 left-[5%] bg-foreground rounded-lg shadow-md"
                style={{ top: `${t.x}%`, transform: "translateY(-50%)" }} />
            ))}
          </button>
        ))}
        <div className="absolute bottom-[20%] left-0 right-0 h-px border-t-2 border-dashed border-primary/30" />
      </div>
    </div>
  );
};

export default PianoTiles;
