import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const MathChallenge = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  const generate = useCallback(() => {
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 20) + 1;
    let b = Math.floor(Math.random() * 15) + 1;
    let ans = 0;
    if (op === "+") ans = a + b;
    else if (op === "-") { if (a < b) [a, b] = [b, a]; ans = a - b; }
    else { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; ans = a * b; }
    setQuestion(`${a} ${op} ${b}`);
    setAnswer(ans);
    const opts = [ans];
    while (opts.length < 4) {
      const wrong = ans + (Math.floor(Math.random() * 10) - 5);
      if (wrong !== ans && !opts.includes(wrong) && wrong >= 0) opts.push(wrong);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    setTimeLeft(5);
    setRound(r => r + 1);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { handleWrong(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  const handleAnswer = (val: number) => {
    if (val === answer) { setScore(s => s + 10 + timeLeft * 2); generate(); }
    else handleWrong();
  };

  const handleWrong = () => {
    if (lives <= 1) { setGameOver(true); setLives(0); } else { setLives(l => l - 1); generate(); }
  };

  const start = () => { setStarted(true); setScore(0); setLives(3); setRound(0); setGameOver(false); generate(); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧮</div>
      <h2 className="text-xl font-bold">Math Challenge</h2>
      <p className="text-sm text-muted-foreground text-center">Solve math problems quickly! Faster = more points.</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🧮</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 60)} className="rounded-xl">Submit</Button>
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
      <motion.div key={round} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
        className="text-4xl font-black text-primary py-6">{question} = ?</motion.div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {options.map((o, i) => (
          <Button key={i} onClick={() => handleAnswer(o)} variant="outline"
            className="h-14 rounded-xl text-xl font-bold hover:bg-primary hover:text-primary-foreground">{o}</Button>
        ))}
      </div>
    </div>
  );
};

export default MathChallenge;
