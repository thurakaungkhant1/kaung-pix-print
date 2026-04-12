import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const CoinFlip = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds] = useState(15);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [playerCall, setPlayerCall] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const flip = (call: string) => {
    if (flipping) return;
    setFlipping(true);
    setPlayerCall(call);
    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? "Heads" : "Tails";
      setResult(outcome);
      const won = call === outcome;
      if (won) {
        const pts = 5 + streak * 2;
        setScore(s => s + pts);
        setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n; });
      } else { setStreak(0); }
      const newRound = round + 1;
      setRound(newRound);
      setFlipping(false);
      if (newRound >= maxRounds) setGameOver(true);
    }, 1000);
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setRound(0); setStreak(0); setBestStreak(0); setResult(null); setPlayerCall(null); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🪙</div>
      <h2 className="text-xl font-bold">Coin Flip</h2>
      <p className="text-sm text-muted-foreground text-center">Call heads or tails! Build streaks for bonus points.</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🪙</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-sm text-muted-foreground">Best streak: {bestStreak}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, bestStreak >= 3)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">Round {round + 1}/{maxRounds}</span>
      </div>
      {streak > 0 && <span className="text-xs font-bold text-primary">🔥 Streak: {streak}</span>}
      <motion.div animate={{ rotateY: flipping ? 720 : 0 }} transition={{ duration: 1 }}
        className="text-7xl py-4">{flipping ? "🪙" : result === "Heads" ? "🟡" : result === "Tails" ? "⚪" : "🪙"}</motion.div>
      {result && !flipping && (
        <p className={`text-lg font-bold ${playerCall === result ? "text-green-500" : "text-red-500"}`}>
          {result}! {playerCall === result ? "✅ Correct!" : "❌ Wrong!"}
        </p>
      )}
      <div className="flex gap-4">
        <Button onClick={() => flip("Heads")} disabled={flipping} size="lg" variant="outline" className="rounded-xl text-lg px-8">
          🟡 Heads
        </Button>
        <Button onClick={() => flip("Tails")} disabled={flipping} size="lg" variant="outline" className="rounded-xl text-lg px-8">
          ⚪ Tails
        </Button>
      </div>
    </div>
  );
};

export default CoinFlip;
