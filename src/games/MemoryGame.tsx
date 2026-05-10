import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const EMOJIS = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎸", "🎺"];

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const MemoryGame = ({ onGameEnd }: Props) => {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const shuffle = () => {
    const pairs = [...EMOJIS, ...EMOJIS];
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    setCards(pairs); setFlipped([]); setMatched([]); setMoves(0); setGameOver(false);
  };

  useEffect(() => { shuffle(); }, []);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameOver(true);
      onGameEnd(Math.max(0, 200 - moves * 5), true);
    }
  }, [matched, cards]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a] === cards[b]) { setMatched(prev => [...prev, a, b]); setFlipped([]); }
      else { setTimeout(() => setFlipped([]), 800); }
    }
  }, [flipped, cards]);

  const handleClick = (i: number) => {
    if (flipped.length >= 2 || flipped.includes(i) || matched.includes(i) || gameOver) return;
    setFlipped(prev => [...prev, i]);
    setMoves(m => m + 1);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="text-xs px-3 py-1.5">
          👆 Moves: <span className="font-bold ml-1">{moves}</span>
        </Badge>
        <Badge variant="secondary" className="text-xs px-3 py-1.5">
          ✅ Matched: <span className="font-bold text-primary ml-1">{matched.length / 2}/{EMOJIS.length}</span>
        </Badge>
      </div>

      {gameOver && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 text-primary"
        >
          <Trophy className="h-5 w-5" />
          <p className="text-lg font-display font-bold">🎉 All pairs found!</p>
        </motion.div>
      )}

      {/* Card Grid — 3D flip */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-[420px]" style={{ perspective: "1000px" }}>
        {cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(i);
          const isMatched = matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={isFlipped}
              className="relative aspect-square w-full rounded-2xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Back face */}
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center text-2xl text-white/80 font-bold border border-white/10"
                  style={{
                    backfaceVisibility: "hidden",
                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 50%, #312e81 100%)",
                    boxShadow: "inset 0 2px 6px rgba(255,255,255,0.25), 0 6px 14px rgba(0,0,0,0.35)",
                  }}
                >
                  ?
                </div>
                {/* Front face */}
                <div
                  className={`absolute inset-0 rounded-2xl flex items-center justify-center text-3xl ${isMatched ? "opacity-90" : ""}`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: isMatched
                      ? "linear-gradient(135deg, #bbf7d0 0%, #4ade80 60%, #16a34a 100%)"
                      : "linear-gradient(135deg, #fef3c7 0%, #fde68a 60%, #f59e0b 100%)",
                    boxShadow: isMatched
                      ? "inset 0 2px 6px rgba(255,255,255,0.5), 0 6px 14px rgba(34,197,94,0.4)"
                      : "inset 0 2px 6px rgba(255,255,255,0.5), 0 6px 14px rgba(0,0,0,0.25)",
                  }}
                >
                  <span style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>{emoji}</span>
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      <Button onClick={shuffle} variant="outline" size="sm" className="gap-2 rounded-xl">
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
};

export default MemoryGame;
