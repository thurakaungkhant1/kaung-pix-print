import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const SpotDifference = ({ onGameEnd }: Props) => {
  const EMOJIS = ["🌸","🌺","🌻","🌼","🌷","🌹","💐","🌿","🍀","🍁","🍂","🍃","🌾","🌵","🌲","🌳"];
  const [grid, setGrid] = useState<string[]>([]);
  const [diffIdx, setDiffIdx] = useState(-1);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds] = useState(10);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { nextRound(false); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  const generatePuzzle = () => {
    const base = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    let diff = base;
    while (diff === base) diff = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const size = 16;
    const idx = Math.floor(Math.random() * size);
    const g = Array(size).fill(base);
    g[idx] = diff;
    setGrid(g);
    setDiffIdx(idx);
    setTimeLeft(5);
  };

  const nextRound = (correct: boolean) => {
    if (correct) setScore(s => s + 10 + timeLeft * 3);
    const newRound = round + 1;
    setRound(newRound);
    if (newRound >= maxRounds) { setGameOver(true); return; }
    generatePuzzle();
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setRound(0); generatePuzzle(); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-bold">Spot the Difference</h2>
      <p className="text-sm text-muted-foreground">Find the different emoji in the grid!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 60)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">{round + 1}/{maxRounds}</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <p className="text-xs text-muted-foreground">Find the different one!</p>
      <div className="grid grid-cols-4 gap-2">
        {grid.map((e, i) => (
          <motion.button key={`${round}-${i}`} whileTap={{ scale: 0.8 }}
            onClick={() => { if (i === diffIdx) nextRound(true); else setScore(s => Math.max(0, s - 3)); }}
            className="text-3xl w-14 h-14 rounded-xl bg-muted hover:bg-muted/70 active:bg-primary/20 transition-colors flex items-center justify-center">
            {e}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SpotDifference;
