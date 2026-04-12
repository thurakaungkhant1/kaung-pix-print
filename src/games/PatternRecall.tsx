import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const PatternRecall = ({ onGameEnd }: Props) => {
  const [grid, setGrid] = useState<boolean[]>(Array(9).fill(false));
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">("idle");
  const [showingIdx, setShowingIdx] = useState(-1);

  const startLevel = useCallback(async (lvl: number) => {
    const count = lvl + 2;
    const cells: number[] = [];
    while (cells.length < count) {
      const r = Math.floor(Math.random() * 9);
      if (!cells.includes(r)) cells.push(r);
    }
    setPattern(cells);
    setPlayerPattern([]);
    setPhase("show");
    for (let i = 0; i < cells.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setShowingIdx(cells[i]);
      await new Promise(r => setTimeout(r, 600));
      setShowingIdx(-1);
    }
    await new Promise(r => setTimeout(r, 300));
    setPhase("input");
  }, []);

  const handleCellClick = (idx: number) => {
    if (phase !== "input") return;
    const newPlayer = [...playerPattern, idx];
    setPlayerPattern(newPlayer);
    const pos = newPlayer.length - 1;
    if (!pattern.includes(idx)) { setPhase("over"); return; }
    if (newPlayer.length === pattern.length) {
      const pts = level * 10;
      setScore(s => s + pts);
      setLevel(l => l + 1);
      setTimeout(() => startLevel(level + 1), 800);
    }
  };

  const start = () => { setScore(0); setLevel(1); startLevel(1); };

  if (phase === "idle") return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧩</div>
      <h2 className="text-xl font-bold">Pattern Recall</h2>
      <p className="text-sm text-muted-foreground text-center">Remember which cells light up and tap them in order!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (phase === "over") return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧩</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-sm text-muted-foreground">Level reached: {level}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 30)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">Level {level}</span>
      </div>
      {phase === "show" && <p className="text-sm text-primary animate-pulse font-medium">Watch the pattern...</p>}
      {phase === "input" && <p className="text-sm text-muted-foreground">Tap the cells! ({playerPattern.length}/{pattern.length})</p>}
      <div className="grid grid-cols-3 gap-2 w-48">
        {Array(9).fill(0).map((_, i) => (
          <motion.button key={i} whileTap={{ scale: 0.9 }} onClick={() => handleCellClick(i)}
            className={`w-14 h-14 rounded-xl border-2 transition-all duration-200
              ${showingIdx === i ? "bg-primary border-primary shadow-lg" :
                playerPattern.includes(i) ? "bg-primary/30 border-primary/50" :
                "bg-muted border-border/50 hover:bg-muted/80"}`}
          />
        ))}
      </div>
    </div>
  );
};

export default PatternRecall;
