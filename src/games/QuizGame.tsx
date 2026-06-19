import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, CheckCircle, XCircle, Trophy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { nextAIItem, prefetchAI } from "@/lib/aiQuestions";

interface AIQuiz { q: string; options: string[]; answerIndex: number }
interface QItem { q: string; a: string[]; c: number }

const FALLBACK: QItem[] = [
  { q: "Myanmar's capital city?", a: ["Naypyidaw", "Yangon", "Mandalay", "Bagan"], c: 0 },
  { q: "Largest lake in Myanmar?", a: ["Inle Lake", "Indawgyi Lake", "Meiktila Lake", "Taungthaman Lake"], c: 1 },
  { q: "Myanmar currency?", a: ["Baht", "Kyat", "Rupee", "Dong"], c: 1 },
  { q: "Highest mountain in Myanmar?", a: ["Hkakabo Razi", "Mount Victoria", "Nat Ma Taung", "Loi Pangnao"], c: 0 },
  { q: "Year Myanmar gained independence?", a: ["1945", "1947", "1948", "1950"], c: 2 },
];

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const QuizGame = ({ onGameEnd }: Props) => {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questions, setQuestions] = useState<QItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    setLoading(true);
    prefetchAI("quiz");
    const out: QItem[] = [];
    for (let i = 0; i < 5; i++) {
      const ai = await nextAIItem<AIQuiz>("quiz");
      if (ai && Array.isArray(ai.options) && ai.options.length === 4) {
        out.push({ q: ai.q, a: ai.options, c: Math.max(0, Math.min(3, ai.answerIndex)) });
      }
    }
    while (out.length < 5) {
      const fb = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      if (!out.some(o => o.q === fb.q)) out.push(fb);
    }
    setQuestions(out);
    setLoading(false);
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleAnswer = (idx: number) => {
    if (showResult) return;
    setSelected(idx); setShowResult(true);
    if (idx === questions[current].c) setScore(s => s + 20);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      const finalScore = score + (selected === questions[current].c ? 20 : 0);
      onGameEnd(finalScore, finalScore >= 60);
    } else { setCurrent(c => c + 1); setSelected(null); setShowResult(false); }
  };

  const reset = async () => {
    setCurrent(0); setScore(0); setSelected(null); setShowResult(false); setFinished(false);
    await loadQuestions();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">AI is preparing fresh questions…</p>
      </div>
    );
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 py-4">
        <div className="p-4 rounded-2xl bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <p className="text-4xl font-display font-bold text-primary">{score}/100</p>
        <p className="text-lg font-bold">{score >= 60 ? "🎉 Great job!" : "📚 Study more!"}</p>
        <Button onClick={reset} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <RotateCcw className="h-4 w-4" /> Play Again
        </Button>
      </motion.div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <div className="w-full flex items-center justify-between">
        <Badge variant="secondary" className="text-xs px-3 py-1">Q{current + 1}/{questions.length}</Badge>
        <Badge variant="secondary" className="text-xs px-3 py-1">Score: <span className="font-bold text-primary ml-1">{score}</span></Badge>
      </div>
      <Progress value={progress} className="h-1.5 w-full" />

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="w-full space-y-4">
          <Card className="p-4 rounded-2xl border-border/50 text-center">
            <p className="text-base font-display font-bold">{q.q}</p>
          </Card>

          <div className="grid gap-2.5 w-full">
            {q.a.map((ans, i) => (
              <motion.button
                key={i}
                onClick={() => handleAnswer(i)}
                whileHover={!showResult ? { scale: 1.01 } : {}}
                whileTap={!showResult ? { scale: 0.98 } : {}}
                className={`p-3.5 rounded-xl text-left text-sm font-medium transition-all border-2
                  ${showResult
                    ? i === q.c
                      ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400"
                      : i === selected
                        ? "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400"
                        : "border-border/30 opacity-40"
                    : "border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 cursor-pointer"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {showResult && i === q.c && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                  {showResult && i === selected && i !== q.c && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  {ans}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {showResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={next} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            {current + 1 >= questions.length ? "See Results" : "Next Question →"}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default QuizGame;
