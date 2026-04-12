import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

interface Card { id: number; suit: string; value: number; display: string; }

const HiLo = ({ onGameEnd }: Props) => {
  const suits = ["♠️","♥️","♦️","♣️"];
  const values = [
    { v: 1, d: "A" }, { v: 2, d: "2" }, { v: 3, d: "3" }, { v: 4, d: "4" }, { v: 5, d: "5" },
    { v: 6, d: "6" }, { v: 7, d: "7" }, { v: 8, d: "8" }, { v: 9, d: "9" }, { v: 10, d: "10" },
    { v: 11, d: "J" }, { v: 12, d: "Q" }, { v: 13, d: "K" },
  ];

  const randomCard = (): Card => {
    const s = suits[Math.floor(Math.random() * suits.length)];
    const v = values[Math.floor(Math.random() * values.length)];
    return { id: Math.random(), suit: s, value: v.v, display: v.d };
  };

  const [current, setCurrent] = useState<Card>(randomCard());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState("");

  const guess = (higher: boolean) => {
    const next = randomCard();
    const correct = higher ? next.value >= current.value : next.value <= current.value;
    if (correct) {
      const pts = 5 + streak * 2;
      setScore(s => s + pts);
      setStreak(s => s + 1);
      setResult("✅ Correct!");
    } else {
      setGameOver(true);
      setResult("❌ Wrong!");
    }
    setCurrent(next);
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setStreak(0); setCurrent(randomCard()); setResult(""); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🃏</div>
      <h2 className="text-xl font-bold">Hi-Lo Cards</h2>
      <p className="text-sm text-muted-foreground">Will the next card be higher or lower?</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🃏</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-sm text-muted-foreground">Streak: {streak}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, streak >= 5)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">Streak: {streak}</span>
      </div>
      {result && <p className="text-sm font-medium">{result}</p>}
      <motion.div key={current.id} initial={{ rotateY: 180 }} animate={{ rotateY: 0 }}
        className="w-32 h-44 rounded-2xl bg-card border-2 border-border flex flex-col items-center justify-center shadow-lg">
        <span className="text-4xl">{current.suit}</span>
        <span className="text-3xl font-black mt-1">{current.display}</span>
      </motion.div>
      <p className="text-xs text-muted-foreground">Higher or Lower?</p>
      <div className="flex gap-4">
        <Button onClick={() => guess(true)} size="lg" className="rounded-xl px-8 gap-2">
          📈 Higher
        </Button>
        <Button onClick={() => guess(false)} size="lg" variant="outline" className="rounded-xl px-8 gap-2">
          📉 Lower
        </Button>
      </div>
    </div>
  );
};

export default HiLo;
