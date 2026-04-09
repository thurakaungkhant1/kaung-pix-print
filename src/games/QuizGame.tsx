import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle, XCircle } from "lucide-react";

const QUESTIONS = [
  { q: "Myanmar's capital city?", a: ["Naypyidaw", "Yangon", "Mandalay", "Bagan"], c: 0 },
  { q: "Largest lake in Myanmar?", a: ["Inle Lake", "Indawgyi Lake", "Meiktila Lake", "Taungthaman Lake"], c: 1 },
  { q: "Myanmar currency?", a: ["Baht", "Kyat", "Rupee", "Dong"], c: 1 },
  { q: "Highest mountain in Myanmar?", a: ["Hkakabo Razi", "Mount Victoria", "Nat Ma Taung", "Loi Pangnao"], c: 0 },
  { q: "Year Myanmar gained independence?", a: ["1945", "1947", "1948", "1950"], c: 2 },
  { q: "What does 'Mingalaba' mean?", a: ["Thank you", "Hello", "Goodbye", "Please"], c: 1 },
  { q: "Shwedagon Pagoda is in which city?", a: ["Mandalay", "Bagan", "Yangon", "Sagaing"], c: 2 },
  { q: "Official name of Myanmar?", a: ["Republic of Myanmar", "Myanmar Federation", "Republic of the Union of Myanmar", "Union of Myanmar"], c: 2 },
  { q: "Longest river in Myanmar?", a: ["Irrawaddy", "Salween", "Chindwin", "Sittaung"], c: 0 },
  { q: "Which game is most popular in Myanmar?", a: ["PUBG Mobile", "Mobile Legends", "Free Fire", "Genshin Impact"], c: 1 },
];

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const QuizGame = ({ onGameEnd }: Props) => {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [shuffled, setShuffled] = useState(QUESTIONS);

  useEffect(() => {
    const s = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setShuffled(s);
  }, []);

  const handleAnswer = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === shuffled[current].c) {
      setScore(s => s + 20);
    }
  };

  const next = () => {
    if (current + 1 >= shuffled.length) {
      setFinished(true);
      const finalScore = score + (selected === shuffled[current].c ? 20 : 0);
      onGameEnd(finalScore, finalScore >= 60);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const reset = () => {
    setShuffled([...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5));
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-3xl font-bold text-primary">{score}/100</p>
        <p className="text-lg font-bold">{score >= 60 ? "🎉 Great job!" : "📚 Study more!"}</p>
        <Button onClick={reset} className="btn-neon gap-2"><RotateCcw className="h-4 w-4" /> Play Again</Button>
      </div>
    );
  }

  const q = shuffled[current];

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <div className="flex justify-between w-full text-sm">
        <span>Question {current + 1}/{shuffled.length}</span>
        <span className="font-bold text-primary">Score: {score}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / shuffled.length) * 100}%` }} />
      </div>
      <p className="text-lg font-bold text-center">{q.q}</p>
      <div className="grid gap-2 w-full">
        {q.a.map((ans, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className={`p-3 rounded-xl text-left text-sm font-medium transition-all border-2
              ${showResult
                ? i === q.c
                  ? "bg-green-500/20 border-green-500 text-green-700"
                  : i === selected
                    ? "bg-red-500/20 border-red-500 text-red-700"
                    : "border-border/50 opacity-50"
                : "border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98]"
              }`}
          >
            <span className="flex items-center gap-2">
              {showResult && i === q.c && <CheckCircle className="h-4 w-4 text-green-500" />}
              {showResult && i === selected && i !== q.c && <XCircle className="h-4 w-4 text-red-500" />}
              {ans}
            </span>
          </button>
        ))}
      </div>
      {showResult && (
        <Button onClick={next} className="btn-neon">
          {current + 1 >= shuffled.length ? "See Results" : "Next Question"}
        </Button>
      )}
    </div>
  );
};

export default QuizGame;
