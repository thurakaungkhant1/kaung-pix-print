import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const WORDS = ["hello","world","gaming","points","reward","speed","quick","smart","pixel","magic",
  "power","light","brave","charm","swift","peace","storm","flame","tiger","ocean",
  "music","dance","dream","cloud","stone","heart","royal","eagle","frost","candy"];

const TypingRace = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [wordsTyped, setWordsTyped] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, gameOver]);

  const nextWord = () => {
    setCurrentWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setInput("");
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setTimeLeft(30); setWordsTyped(0); nextWord(); setTimeout(() => inputRef.current?.focus(), 100); };

  const handleInput = (val: string) => {
    setInput(val);
    if (val.toLowerCase() === currentWord) {
      setScore(s => s + 10);
      setWordsTyped(w => w + 1);
      nextWord();
    }
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">⌨️</div>
      <h2 className="text-xl font-bold">Typing Race</h2>
      <p className="text-sm text-muted-foreground">Type words as fast as you can in 30 seconds!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">⌨️</div>
      <h2 className="text-xl font-bold">Time's Up!</h2>
      <p className="text-sm text-muted-foreground">{wordsTyped} words typed</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, wordsTyped >= 10)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">{wordsTyped} words</span>
        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{timeLeft}s</span>
      </div>
      <div className="text-3xl font-black text-primary tracking-widest py-6">
        {currentWord.split("").map((l, i) => (
          <span key={i} className={i < input.length ? (input[i] === l ? "text-green-500" : "text-red-500") : ""}>
            {l}
          </span>
        ))}
      </div>
      <Input ref={inputRef} value={input} onChange={e => handleInput(e.target.value)}
        className="rounded-xl text-center text-lg font-mono max-w-xs" autoComplete="off" autoFocus />
    </div>
  );
};

export default TypingRace;
