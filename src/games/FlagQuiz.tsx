import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const FLAGS = [
  { flag: "🇲🇲", name: "Myanmar" }, { flag: "🇹🇭", name: "Thailand" }, { flag: "🇯🇵", name: "Japan" },
  { flag: "🇰🇷", name: "South Korea" }, { flag: "🇨🇳", name: "China" }, { flag: "🇺🇸", name: "USA" },
  { flag: "🇬🇧", name: "UK" }, { flag: "🇫🇷", name: "France" }, { flag: "🇩🇪", name: "Germany" },
  { flag: "🇮🇳", name: "India" }, { flag: "🇧🇷", name: "Brazil" }, { flag: "🇦🇺", name: "Australia" },
  { flag: "🇮🇹", name: "Italy" }, { flag: "🇪🇸", name: "Spain" }, { flag: "🇷🇺", name: "Russia" },
  { flag: "🇨🇦", name: "Canada" }, { flag: "🇲🇽", name: "Mexico" }, { flag: "🇸🇬", name: "Singapore" },
  { flag: "🇻🇳", name: "Vietnam" }, { flag: "🇵🇭", name: "Philippines" },
];

const FlagQuiz = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds] = useState(15);
  const [current, setCurrent] = useState(FLAGS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState("");

  const generate = () => {
    const q = FLAGS[Math.floor(Math.random() * FLAGS.length)];
    setCurrent(q);
    const opts = [q.name];
    while (opts.length < 4) {
      const r = FLAGS[Math.floor(Math.random() * FLAGS.length)].name;
      if (!opts.includes(r)) opts.push(r);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    setFeedback("");
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setRound(0); setLives(3); generate(); };

  const answer = (name: string) => {
    const newRound = round + 1;
    setRound(newRound);
    if (name === current.name) {
      setScore(s => s + 10);
      setFeedback("✅ Correct!");
    } else {
      setFeedback(`❌ It was ${current.name}`);
      if (lives <= 1) { setGameOver(true); setLives(0); return; }
      setLives(l => l - 1);
    }
    if (newRound >= maxRounds) { setGameOver(true); return; }
    setTimeout(generate, 800);
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏳️</div>
      <h2 className="text-xl font-bold">Flag Quiz</h2>
      <p className="text-sm text-muted-foreground">Guess the country from the flag!</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏳️</div>
      <h2 className="text-xl font-bold">Game Over!</h2>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, score >= 80)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm">{"❤️".repeat(lives)}</span>
        <span className="text-sm text-muted-foreground">{round}/{maxRounds}</span>
      </div>
      <div className="text-7xl py-4">{current.flag}</div>
      {feedback && <p className="text-sm font-medium">{feedback}</p>}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {options.map(o => (
          <Button key={o} onClick={() => answer(o)} variant="outline"
            className="h-12 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground">{o}</Button>
        ))}
      </div>
    </div>
  );
};

export default FlagQuiz;
