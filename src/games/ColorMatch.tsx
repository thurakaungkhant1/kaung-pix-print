import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const COLORS = ["#ef4444","#3b82f6","#22c55e","#eab308","#a855f7","#ec4899","#f97316","#06b6d4"];
const COLOR_NAMES = ["Red","Blue","Green","Yellow","Purple","Pink","Orange","Cyan"];

const ColorMatch = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [displayColor, setDisplayColor] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(3);
  const [started, setStarted] = useState(false);

  const generateRound = useCallback(() => {
    const colorIdx = Math.floor(Math.random() * COLORS.length);
    const textIdx = Math.floor(Math.random() * COLOR_NAMES.length);
    setDisplayColor(COLORS[colorIdx]);
    setDisplayText(COLOR_NAMES[textIdx]);
    const correct = COLOR_NAMES[colorIdx];
    const opts = [correct];
    while (opts.length < 4) {
      const r = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
      if (!opts.includes(r)) opts.push(r);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    setTimeLeft(3);
    setRound(r => r + 1);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { handleWrong(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  const handleAnswer = (answer: string) => {
    const correctAnswer = COLOR_NAMES[COLORS.indexOf(displayColor)];
    if (answer === correctAnswer) {
      setScore(s => s + 10);
      generateRound();
    } else handleWrong();
  };

  const handleWrong = () => {
    if (lives <= 1) { setGameOver(true); setLives(0); }
    else { setLives(l => l - 1); generateRound(); }
  };

  const start = () => { setStarted(true); setScore(0); setLives(3); setRound(0); setGameOver(false); generateRound(); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎨</div>
      <h2 className="text-xl font-bold">Color Match</h2>
      <p className="text-sm text-muted-foreground text-center">What COLOR is the text displayed in?<br/>Don't read the word — look at the color!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🎨</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <p className="text-sm text-muted-foreground">Round {round}</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 50)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm">{"❤️".repeat(lives)}</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <motion.div key={round} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-4xl font-black py-8" style={{ color: displayColor }}>
        {displayText}
      </motion.div>
      <p className="text-xs text-muted-foreground">What COLOR is this text?</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {options.map(o => (
          <Button key={o} onClick={() => handleAnswer(o)} variant="outline"
            className="h-12 rounded-xl text-sm font-bold hover:bg-primary hover:text-primary-foreground">{o}</Button>
        ))}
      </div>
    </div>
  );
};

export default ColorMatch;
