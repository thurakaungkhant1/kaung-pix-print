import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const TowerStack = ({ onGameEnd }: Props) => {
  const [blocks, setBlocks] = useState<{ x: number; width: number }[]>([]);
  const [moving, setMoving] = useState({ x: 0, dir: 1 });
  const [currentWidth, setCurrentWidth] = useState(60);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(2);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setMoving(prev => {
        let newX = prev.x + prev.dir * speed;
        let newDir = prev.dir;
        if (newX > 100 - currentWidth / 2) { newX = 100 - currentWidth / 2; newDir = -1; }
        if (newX < 0) { newX = 0; newDir = 1; }
        return { x: newX, dir: newDir };
      });
    }, 30);
    return () => clearInterval(interval);
  }, [started, gameOver, speed, currentWidth]);

  const drop = () => {
    const lastBlock = blocks[blocks.length - 1];
    const mx = moving.x;

    if (blocks.length === 0) {
      setBlocks([{ x: mx, width: currentWidth }]);
      setScore(s => s + 10);
      setMoving({ x: 0, dir: 1 });
      return;
    }

    const overlap = Math.min(lastBlock.x + lastBlock.width, mx + currentWidth) - Math.max(lastBlock.x, mx);
    if (overlap <= 0) { setGameOver(true); return; }

    const newX = Math.max(lastBlock.x, mx);
    setBlocks(prev => [...prev, { x: newX, width: overlap }]);
    setCurrentWidth(overlap);
    setScore(s => s + 10);
    if (score > 0 && score % 30 === 0) setSpeed(sp => Math.min(sp + 0.5, 5));
    setMoving({ x: 0, dir: 1 });
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setBlocks([]); setCurrentWidth(60); setSpeed(2); setMoving({ x: 0, dir: 1 }); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏗️</div>
      <h2 className="text-xl font-bold">Tower Stack</h2>
      <p className="text-sm text-muted-foreground">Stack blocks perfectly! Misalignment shrinks the block.</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏗️</div>
      <h2 className="text-xl font-bold">Tower Fell!</h2>
      <p className="text-sm text-muted-foreground">{blocks.length} blocks stacked</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, blocks.length >= 5)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  const visibleBlocks = blocks.slice(-8);

  return (
    <div className="flex flex-col items-center gap-4 py-2" onClick={drop}>
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">{blocks.length} blocks</span>
      </div>
      <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-border/50 shadow-inner"
        style={{ background: "linear-gradient(180deg, #fde68a 0%, #fb923c 35%, #7c3aed 75%, #1e1b4b 100%)", perspective: "600px" }}>
        {/* horizon */}
        <div className="absolute left-0 right-0 bottom-0 h-16 opacity-60"
          style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))" }} />
        {/* Moving block */}
        <div className="absolute h-7 rounded-sm transition-none"
          style={{
            left: `${moving.x}%`, width: `${currentWidth}%`, top: "10px",
            background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
            boxShadow: "0 6px 0 rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25)",
            transform: "rotateX(15deg)",
          }} />
        {/* Stacked blocks */}
        {visibleBlocks.map((b, i) => {
          const hue = (i * 35) % 360;
          return (
            <div key={i} className="absolute h-7 rounded-sm"
              style={{
                left: `${b.x}%`, width: `${b.width}%`, bottom: `${i * 28}px`,
                background: `linear-gradient(180deg, hsl(${hue},75%,60%) 0%, hsl(${hue},75%,40%) 100%)`,
                boxShadow: "0 5px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.25)",
                transform: "rotateX(15deg)",
              }} />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Tap to drop!</p>
    </div>
  );
};

export default TowerStack;
