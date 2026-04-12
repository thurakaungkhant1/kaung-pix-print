import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const EmojiMatch = ({ onGameEnd }: Props) => {
  const EMOJIS = ["😀","😎","🥳","🤩","😍","🤗","😇","🥶","😱","🤯","😴","🤠","👻","👽","🤖","💀"];
  const [target, setTarget] = useState("");
  const [grid, setGrid] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [found, setFound] = useState(0);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  const generateGrid = () => {
    const t = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    setTarget(t);
    const g: string[] = [];
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) g.push(t);
    while (g.length < 20) {
      const e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      if (e !== t) g.push(e);
    }
    setGrid(g.sort(() => Math.random() - 0.5));
    setFound(0);
  };

  const handleTap = (emoji: string, idx: number) => {
    if (emoji === target) {
      setScore(s => s + 5);
      setGrid(prev => prev.map((e, i) => i === idx ? "✅" : e));
      setFound(f => f + 1);
      const remaining = grid.filter((e, i) => e === target && i !== idx).length;
      if (remaining === 0) setTimeout(generateGrid, 500);
    } else { setScore(s => Math.max(0, s - 2)); }
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setTimeLeft(30); generateGrid(); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">😀</div>
      <h2 className="text-xl font-bold">Emoji Match</h2>
      <p className="text-sm text-muted-foreground">Find all matching emojis in 30 seconds!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">😀</div>
      <h2 className="text-xl font-bold">Time's Up!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 40)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <div className="text-center p-2 bg-primary/5 rounded-xl border border-primary/20">
        <span className="text-xs text-muted-foreground">Find all: </span>
        <span className="text-2xl">{target}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {grid.map((e, i) => (
          <button key={i} onClick={() => e !== "✅" && handleTap(e, i)}
            className={`text-2xl h-12 rounded-lg transition-all ${e === "✅" ? "bg-green-500/20" : "bg-muted hover:bg-muted/80 active:scale-90 cursor-pointer"}`}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiMatch;
