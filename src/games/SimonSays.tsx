import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const COLORS = [
  { name: "red", bg: "bg-red-500", active: "bg-red-300" },
  { name: "blue", bg: "bg-blue-500", active: "bg-blue-300" },
  { name: "green", bg: "bg-green-500", active: "bg-green-300" },
  { name: "yellow", bg: "bg-yellow-500", active: "bg-yellow-300" },
];

const SimonSays = ({ onGameEnd }: Props) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSeq, setPlayerSeq] = useState<number[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isShowing, setIsShowing] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const playSequence = useCallback(async (seq: number[]) => {
    setIsShowing(true);
    for (let i = 0; i < seq.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setActiveIdx(seq[i]);
      await new Promise(r => setTimeout(r, 500));
      setActiveIdx(null);
    }
    await new Promise(r => setTimeout(r, 200));
    setIsShowing(false);
  }, []);

  const addToSequence = useCallback(() => {
    const next = Math.floor(Math.random() * 4);
    const newSeq = [...sequence, next];
    setSequence(newSeq);
    setPlayerSeq([]);
    playSequence(newSeq);
  }, [sequence, playSequence]);

  const handlePress = (idx: number) => {
    if (isShowing || gameOver) return;
    setActiveIdx(idx);
    setTimeout(() => setActiveIdx(null), 200);
    const newPlayerSeq = [...playerSeq, idx];
    setPlayerSeq(newPlayerSeq);
    const pos = newPlayerSeq.length - 1;
    if (newPlayerSeq[pos] !== sequence[pos]) { setGameOver(true); return; }
    if (newPlayerSeq.length === sequence.length) {
      setScore(s => s + sequence.length * 5);
      setTimeout(addToSequence, 800);
    }
  };

  const start = () => {
    setStarted(true); setGameOver(false); setScore(0); setSequence([]);
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setPlayerSeq([]);
    playSequence(seq);
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔴🟢🔵🟡</div>
      <h2 className="text-xl font-bold">Simon Says</h2>
      <p className="text-sm text-muted-foreground text-center">Watch the pattern and repeat it!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔴🟢🔵🟡</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-sm text-muted-foreground">Level reached: {sequence.length - 1}</p>
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
        <span className="text-sm text-muted-foreground">Level {sequence.length}</span>
      </div>
      {isShowing && <p className="text-sm font-medium text-primary animate-pulse">Watch carefully...</p>}
      {!isShowing && !gameOver && <p className="text-sm text-muted-foreground">Your turn! ({playerSeq.length}/{sequence.length})</p>}
      <div className="grid grid-cols-2 gap-3 w-48 h-48">
        {COLORS.map((c, i) => (
          <motion.button key={c.name} whileTap={{ scale: 0.9 }}
            onClick={() => handlePress(i)}
            className={`rounded-2xl transition-all duration-200 ${activeIdx === i ? c.active : c.bg} ${isShowing ? "pointer-events-none" : "cursor-pointer"} shadow-lg`}
          />
        ))}
      </div>
    </div>
  );
};

export default SimonSays;
