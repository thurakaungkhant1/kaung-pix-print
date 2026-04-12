import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const WORDS = ["APPLE","HOUSE","TRAIN","WATER","LIGHT","MUSIC","DANCE","RIVER","STONE","CLOUD",
  "BREAD","CHAIR","DREAM","FLAME","GLOBE","HEART","OCEAN","PLANE","QUEEN","SHEEP",
  "TIGER","WORLD","BRAIN","CANDY","EAGLE","FROST","GRAPE","HAPPY","IVORY","JEWEL"];

const scramble = (w: string) => w.split("").sort(() => Math.random() - 0.5).join("");

const WordScramble = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [word, setWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [guess, setGuess] = useState("");
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState("");

  const nextWord = useCallback(() => {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w);
    let s = scramble(w);
    while (s === w) s = scramble(w);
    setScrambled(s);
    setGuess("");
    setFeedback("");
    setRound(r => r + 1);
  }, []);

  const start = () => { setStarted(true); setScore(0); setLives(3); setRound(0); setGameOver(false); nextWord(); };

  const submit = () => {
    if (guess.toUpperCase() === word) {
      setScore(s => s + 15); setFeedback("✅ Correct!"); setTimeout(nextWord, 800);
    } else {
      if (lives <= 1) { setGameOver(true); setLives(0); }
      else { setLives(l => l - 1); setFeedback("❌ Try again!"); setGuess(""); }
    }
  };

  const skip = () => {
    if (lives <= 1) { setGameOver(true); setLives(0); }
    else { setLives(l => l - 1); nextWord(); }
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔤</div>
      <h2 className="text-xl font-bold">Word Scramble</h2>
      <p className="text-sm text-muted-foreground text-center">Unscramble the letters to find the word!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🔤</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-sm text-muted-foreground">Last word was: <strong>{word}</strong></p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 45)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm">{"❤️".repeat(lives)}</span>
        <span className="text-sm text-muted-foreground">Round {round}</span>
      </div>
      <motion.div key={scrambled} initial={{ rotateX: 90 }} animate={{ rotateX: 0 }}
        className="flex gap-2 justify-center">
        {scrambled.split("").map((l, i) => (
          <div key={i} className="w-10 h-12 rounded-lg bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-lg font-bold text-primary">
            {l}
          </div>
        ))}
      </motion.div>
      {feedback && <p className="text-sm font-medium">{feedback}</p>}
      <div className="flex gap-2 w-full max-w-xs">
        <Input value={guess} onChange={e => setGuess(e.target.value)} placeholder="Your answer..."
          className="rounded-xl uppercase" onKeyDown={e => e.key === "Enter" && submit()} maxLength={word.length} />
        <Button onClick={submit} className="rounded-xl">Check</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={skip} className="text-xs text-muted-foreground">Skip (-1 ❤️)</Button>
    </div>
  );
};

export default WordScramble;
