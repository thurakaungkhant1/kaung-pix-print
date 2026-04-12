import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const CHOICES = [
  { name: "Rock", emoji: "🪨" },
  { name: "Paper", emoji: "📄" },
  { name: "Scissors", emoji: "✂️" },
];

const RockPaperScissors = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds] = useState(10);
  const [playerChoice, setPlayerChoice] = useState<string | null>(null);
  const [cpuChoice, setCpuChoice] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [wins, setWins] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showing, setShowing] = useState(false);

  const play = (choice: string) => {
    if (showing) return;
    const cpu = CHOICES[Math.floor(Math.random() * 3)].name;
    setPlayerChoice(choice); setCpuChoice(cpu); setShowing(true);
    let res = "";
    if (choice === cpu) { res = "Draw!"; }
    else if ((choice === "Rock" && cpu === "Scissors") || (choice === "Paper" && cpu === "Rock") || (choice === "Scissors" && cpu === "Paper")) {
      res = "You Win!"; setScore(s => s + 10); setWins(w => w + 1);
    } else { res = "You Lose!"; }
    setResult(res);
    const newRound = round + 1;
    setRound(newRound);
    setTimeout(() => {
      setShowing(false);
      if (newRound >= maxRounds) setGameOver(true);
    }, 1500);
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setRound(0); setWins(0); setPlayerChoice(null); setCpuChoice(null); setResult(""); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🪨📄✂️</div>
      <h2 className="text-xl font-bold">Rock Paper Scissors</h2>
      <p className="text-sm text-muted-foreground">Best of {maxRounds} rounds!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏆</div>
      <h2 className="text-xl font-bold">{wins > maxRounds / 2 ? "You Win!" : wins === Math.floor(maxRounds / 2) ? "Draw!" : "You Lose!"}</h2>
      <p className="text-sm text-muted-foreground">{wins} wins out of {maxRounds}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, wins > maxRounds / 2)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">Round {round + 1}/{maxRounds}</span>
      </div>
      {showing && (
        <div className="flex items-center gap-8 py-4">
          <motion.div initial={{ x: -50 }} animate={{ x: 0 }} className="text-center">
            <div className="text-5xl">{CHOICES.find(c => c.name === playerChoice)?.emoji}</div>
            <p className="text-xs mt-1 text-muted-foreground">You</p>
          </motion.div>
          <span className="text-lg font-bold text-muted-foreground">VS</span>
          <motion.div initial={{ x: 50 }} animate={{ x: 0 }} className="text-center">
            <div className="text-5xl">{CHOICES.find(c => c.name === cpuChoice)?.emoji}</div>
            <p className="text-xs mt-1 text-muted-foreground">CPU</p>
          </motion.div>
        </div>
      )}
      {showing && <p className="text-lg font-bold text-primary">{result}</p>}
      {!showing && (
        <div className="flex gap-4">
          {CHOICES.map(c => (
            <button key={c.name} onClick={() => play(c.name)}
              className="text-5xl hover:scale-125 active:scale-95 transition-transform cursor-pointer p-4">
              {c.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RockPaperScissors;
