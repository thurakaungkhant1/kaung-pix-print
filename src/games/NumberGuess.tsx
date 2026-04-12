import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const NumberGuess = ({ onGameEnd }: Props) => {
  const [target, setTarget] = useState(0);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(7);
  const [hint, setHint] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [range, setRange] = useState(100);

  const start = () => {
    const t = Math.floor(Math.random() * range) + 1;
    setTarget(t); setAttempts(0); setGuess(""); setHint(""); setGameOver(false); setWon(false); setStarted(true); setScore(0);
  };

  const handleGuess = () => {
    const g = parseInt(guess);
    if (isNaN(g)) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (g === target) {
      const pts = Math.max(10, 70 - (newAttempts - 1) * 10);
      setScore(pts); setWon(true); setGameOver(true); setHint("🎉 Correct!");
    } else if (newAttempts >= maxAttempts) {
      setGameOver(true); setHint(`The number was ${target}`);
    } else {
      setHint(g < target ? "📈 Higher!" : "📉 Lower!");
    }
    setGuess("");
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔢</div>
      <h2 className="text-xl font-bold">Number Guess</h2>
      <p className="text-sm text-muted-foreground">Guess the number between 1 and {range} in {maxAttempts} tries!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">{won ? "🎉" : "😔"}</div>
      <h2 className="text-xl font-bold">{won ? "You Got It!" : "Game Over!"}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {won && <p className="text-3xl font-bold text-primary">{score} pts</p>}
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, won)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Attempt {attempts}/{maxAttempts}</span>
        <span className="text-sm text-muted-foreground">1 - {range}</span>
      </div>
      {hint && <p className="text-lg font-bold text-primary">{hint}</p>}
      <div className="flex gap-2 w-full max-w-xs">
        <Input type="number" value={guess} onChange={e => setGuess(e.target.value)} placeholder="Enter number"
          className="rounded-xl text-center text-lg" onKeyDown={e => e.key === "Enter" && handleGuess()} min={1} max={range} />
        <Button onClick={handleGuess} className="rounded-xl">Guess</Button>
      </div>
    </div>
  );
};

export default NumberGuess;
