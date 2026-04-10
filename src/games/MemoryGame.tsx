import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-2.5 w-fit">
        {cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(i);
          const isMatched = matched.includes(i);
          return (
            <motion.button
              key={i}
              onClick={() => handleClick(i)}
              whileHover={!isFlipped ? { scale: 1.05 } : {}}
              whileTap={!isFlipped ? { scale: 0.95 } : {}}
              className={`w-16 h-16 rounded-2xl text-2xl flex items-center justify-center transition-all duration-300 font-medium
                ${isFlipped
                  ? isMatched
                    ? "bg-primary/10 border-2 border-primary/40 shadow-[0_0_10px_hsl(var(--primary)/0.15)]"
                    : "bg-accent/10 border-2 border-accent/40"
                  : "bg-card border-2 border-border/50 hover:bg-primary/5 hover:border-primary/20 cursor-pointer"
                }
                ${isMatched ? "opacity-70" : ""}`}
            >
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.span key="emoji" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} exit={{ rotateY: 90 }} transition={{ duration: 0.2 }}>
                    {emoji}
                  </motion.span>
                ) : (
                  <motion.span key="q" className="text-muted-foreground/40 text-lg">?</motion.span>
                )}
              </AnimatePresence>
            </motion.button>
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
