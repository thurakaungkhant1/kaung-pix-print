import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

type Board = number[][];

const SIZE = 4;
const COLORS: Record<number, string> = {
  2: "bg-amber-100 text-amber-900",
  4: "bg-amber-200 text-amber-900",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-red-400 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-yellow-600 text-white",
  1024: "bg-amber-500 text-white",
  2048: "bg-amber-600 text-white font-extrabold",
};

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const Game2048 = ({ onGameEnd }: Props) => {
  const empty = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  const addRandom = (b: Board): Board => {
    const cells: [number, number][] = [];
    b.forEach((row, r) => row.forEach((v, c) => { if (!v) cells.push([r, c]); }));
    if (!cells.length) return b;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    const nb = b.map(row => [...row]);
    nb[r][c] = Math.random() < 0.9 ? 2 : 4;
    return nb;
  };

  const init = () => addRandom(addRandom(empty()));

  const [board, setBoard] = useState<Board>(init);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const slide = (row: number[]): [number[], number] => {
    let s = 0;
    const filtered = row.filter(v => v);
    const merged: number[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        merged.push(filtered[i] * 2);
        s += filtered[i] * 2;
        i++;
      } else {
        merged.push(filtered[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return [merged, s];
  };

  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (gameOver) return;
    let b = board.map(r => [...r]);
    let pts = 0;

    const process = (rows: number[][]): number[][] => {
      return rows.map(row => {
        const [merged, s] = slide(row);
        pts += s;
        return merged;
      });
    };

    const transpose = (m: number[][]) => m[0].map((_, i) => m.map(r => r[i]));
    const reverse = (m: number[][]) => m.map(r => [...r].reverse());

    if (dir === "left") b = process(b);
    else if (dir === "right") b = reverse(process(reverse(b)));
    else if (dir === "up") b = transpose(process(transpose(b)));
    else b = transpose(reverse(process(reverse(transpose(b)))));

    if (JSON.stringify(b) === JSON.stringify(board)) return;

    const nb = addRandom(b);
    setBoard(nb);
    setScore(s => s + pts);

    if (nb.flat().includes(2048) && !won) {
      setWon(true);
      onGameEnd(score + pts, true);
    }

    // Check game over
    const hasEmpty = nb.flat().includes(0);
    if (!hasEmpty) {
      let canMove = false;
      for (let r = 0; r < SIZE && !canMove; r++) {
        for (let c = 0; c < SIZE - 1 && !canMove; c++) {
          if (nb[r][c] === nb[r][c + 1]) canMove = true;
        }
      }
      for (let c = 0; c < SIZE && !canMove; c++) {
        for (let r = 0; r < SIZE - 1 && !canMove; r++) {
          if (nb[r][c] === nb[r + 1][c]) canMove = true;
        }
      }
      if (!canMove) {
        setGameOver(true);
        onGameEnd(score + pts, false);
      }
    }
  }, [board, gameOver, won, score]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      };
      if (map[e.key]) { move(map[e.key]); e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move]);

  // Touch
  useEffect(() => {
    let startX = 0, startY = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) move(dx > 0 ? "right" : "left");
      else if (Math.abs(dy) > 30) move(dy > 0 ? "down" : "up");
    };
    window.addEventListener("touchstart", onStart);
    window.addEventListener("touchend", onEnd);
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [move]);

  const reset = () => { setBoard(init()); setScore(0); setGameOver(false); setWon(false); };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-bold text-primary">Score: {score}</p>
      {gameOver && <p className="text-accent font-bold">Game Over!</p>}
      {won && <p className="text-primary font-bold">🎉 You reached 2048!</p>}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-muted/50 rounded-xl">
        {board.flat().map((v, i) => (
          <div
            key={i}
            className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-sm transition-all
              ${v ? COLORS[v] || "bg-primary text-primary-foreground" : "bg-card/50 border border-border/30"}`}
          >
            {v || ""}
          </div>
        ))}
      </div>
      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 w-fit md:hidden">
        <div />
        <Button size="icon" variant="outline" onClick={() => move("up")} className="h-12 w-12"><ArrowUp /></Button>
        <div />
        <Button size="icon" variant="outline" onClick={() => move("left")} className="h-12 w-12"><ArrowLeft /></Button>
        <Button size="icon" variant="outline" onClick={() => move("down")} className="h-12 w-12"><ArrowDown /></Button>
        <Button size="icon" variant="outline" onClick={() => move("right")} className="h-12 w-12"><ArrowRight /></Button>
      </div>
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RotateCcw className="h-4 w-4" /> New Game
      </Button>
    </div>
  );
};

export default Game2048;
