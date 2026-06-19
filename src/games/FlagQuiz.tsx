import { useState } from "react";
import { Button } from "@/components/ui/button";
import { nextAIItem, prefetchAI } from "@/lib/aiQuestions";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

interface AIFlag { flag: string; name: string; options: string[] }

const FALLBACK: AIFlag[] = [
  { flag: "🇲🇲", name: "Myanmar", options: ["Myanmar", "Thailand", "Laos", "Vietnam"] },
  { flag: "🇯🇵", name: "Japan", options: ["China", "Japan", "Korea", "Singapore"] },
  { flag: "🇺🇸", name: "USA", options: ["UK", "Canada", "USA", "Australia"] },
  { flag: "🇫🇷", name: "France", options: ["Italy", "France", "Spain", "Germany"] },
  { flag: "🇮🇳", name: "India", options: ["India", "Pakistan", "Bangladesh", "Sri Lanka"] },
];

const FlagQuiz = ({ onGameEnd }: Props) => {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [maxRounds] = useState(15);
  const [current, setCurrent] = useState<AIFlag>(FALLBACK[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    let item = await nextAIItem<AIFlag>("flag");
    if (!item || !item.flag || !item.name || !Array.isArray(item.options) || item.options.length !== 4) {
      item = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    }
    // ensure correct answer present + shuffle
    const opts = Array.from(new Set([item.name, ...item.options])).slice(0, 4);
    while (opts.length < 4) opts.push(FALLBACK[Math.floor(Math.random() * FALLBACK.length)].name);
    setCurrent(item);
    setOptions(opts.sort(() => Math.random() - 0.5));
    setFeedback("");
    setLoading(false);
  };

  const start = async () => {
    prefetchAI("flag");
    setStarted(true); setGameOver(false); setScore(0); setRound(0); setLives(3);
    await generate();
  };

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
    setTimeout(() => { void generate(); }, 800);
  };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏳️</div>
      <h2 className="text-xl font-bold">Flag Quiz</h2>
      <p className="text-sm text-muted-foreground">AI-generated flags — never the same round twice!</p>
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
      <div className="text-7xl py-4 min-h-[88px]">{loading ? "…" : current.flag}</div>
      {feedback && <p className="text-sm font-medium">{feedback}</p>}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {options.map(o => (
          <Button key={o} onClick={() => answer(o)} variant="outline" disabled={loading}
            className="h-12 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground">{o}</Button>
        ))}
      </div>
    </div>
  );
};

export default FlagQuiz;
