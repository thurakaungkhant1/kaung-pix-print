import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
    setCards(pairs);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameOver(false);
  };

  useEffect(() => { shuffle(); }, []);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameOver(true);
      const score = Math.max(0, 200 - moves * 5);
      onGameEnd(score, true);
    }
  }, [matched, cards]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        setMatched(prev => [...prev, a, b]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  }, [flipped, cards]);

  const handleClick = (i: number) => {
    if (flipped.length >= 2 || flipped.includes(i) || matched.includes(i) || gameOver) return;
    setFlipped(prev => [...prev, i]);
    setMoves(m => m + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-sm">
        <span className="text-muted-foreground">Moves: <span className="font-bold text-foreground">{moves}</span></span>
        <span className="text-muted-foreground">Matched: <span className="font-bold text-primary">{matched.length / 2}/{EMOJIS.length}</span></span>
      </div>
      {gameOver && <p className="text-lg font-bold text-primary">🎉 You found all pairs!</p>}
      <div className="grid grid-cols-4 gap-2 w-fit">
        {cards.map((emoji, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className={`w-16 h-16 rounded-xl text-2xl flex items-center justify-center transition-all duration-300
                ${isFlipped 
                  ? "bg-primary/10 border-2 border-primary/50 scale-100" 
                  : "bg-card border-2 border-border/50 hover:bg-primary/5 hover:scale-105"}
                ${matched.includes(i) ? "opacity-60" : ""}
                active:scale-95`}
            >
              {isFlipped ? emoji : "?"}
            </button>
          );
        })}
      </div>
      <Button onClick={shuffle} variant="outline" size="sm" className="gap-2">
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
};

export default MemoryGame;
