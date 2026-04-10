import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Cell = "X" | "O" | null;
const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const TicTacToe = ({ onGameEnd }: Props) => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winLine, setWinLine] = useState<number[] | null>(null);

  const checkWinner = (b: Cell[]): { winner: Cell; line: number[] | null } => {
    for (const [a, bb, c] of LINES) {
      if (b[a] && b[a] === b[bb] && b[a] === b[c]) return { winner: b[a], line: [a, bb, c] };
    }
    return { winner: null, line: null };
  };

  const minimax = (b: Cell[], isMax: boolean): number => {
    const { winner } = checkWinner(b);
    if (winner === "O") return 1;
    if (winner === "X") return -1;
    if (b.every(c => c !== null)) return 0;
    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) { b[i] = "O"; best = Math.max(best, minimax(b, false)); b[i] = null; }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) { b[i] = "X"; best = Math.min(best, minimax(b, true)); b[i] = null; }
      }
      return best;
    }
  };

  const aiMove = useCallback((b: Cell[]) => {
    let bestScore = -Infinity, bestMove = -1;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = "O";
        const score = minimax(b, false);
        b[i] = null;
        if (score > bestScore) { bestScore = score; bestMove = i; }
      }
    }
    if (bestMove >= 0) {
      const newBoard = [...b];
      newBoard[bestMove] = "O";
      return newBoard;
    }
    return b;
  }, []);

  const handleClick = (i: number) => {
    if (board[i] || gameOver || !isX) return;
    const newBoard = [...board];
    newBoard[i] = "X";

    const { winner, line } = checkWinner(newBoard);
    if (winner || newBoard.every(c => c !== null)) {
      setBoard(newBoard);
      setGameOver(true);
      setWinLine(line);
      onGameEnd(winner === "X" ? 100 : 0, winner === "X");
      return;
    }

    const afterAi = aiMove(newBoard);
    const aiResult = checkWinner(afterAi);
    if (aiResult.winner || afterAi.every(c => c !== null)) {
      setBoard(afterAi);
      setGameOver(true);
      setWinLine(aiResult.line);
      onGameEnd(aiResult.winner === "X" ? 100 : 0, aiResult.winner === "X");
      return;
    }
    setBoard(afterAi);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setIsX(true); setGameOver(false); setWinLine(null); };
  const { winner } = checkWinner(board);
  const isDraw = !winner && board.every(c => c !== null);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Status */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          {winner ? (
            <motion.div key="win" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1">
              <div className="p-2.5 rounded-xl bg-primary/10 mb-1">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-display font-bold text-primary">
                {winner === "X" ? "🎉 You Win!" : "AI Wins!"}
              </p>
            </motion.div>
          ) : isDraw ? (
            <motion.div key="draw" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-muted-foreground" />
              <p className="text-lg font-bold text-muted-foreground">Draw!</p>
            </motion.div>
          ) : (
            <motion.div key="turn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {isX ? "🎯 Your turn (X)" : "🤖 AI thinking..."}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2.5 w-fit">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i);
          return (
            <motion.button
              key={i}
              onClick={() => handleClick(i)}
              whileHover={!cell && !gameOver ? { scale: 1.05 } : {}}
              whileTap={!cell && !gameOver ? { scale: 0.95 } : {}}
              className={`w-[4.5rem] h-[4.5rem] rounded-2xl text-3xl font-bold
                flex items-center justify-center transition-all duration-200
                ${isWinCell
                  ? "bg-primary/15 border-2 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                  : cell
                    ? "bg-card border-2 border-border/50"
                    : "bg-card border-2 border-border/50 hover:bg-primary/5 hover:border-primary/30 cursor-pointer"
                }
                disabled:cursor-default`}
              disabled={!!cell || gameOver}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={cell === "X" ? "text-primary" : "text-accent"}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <Button onClick={reset} variant="outline" size="sm" className="gap-2 rounded-xl">
        <RotateCcw className="h-4 w-4" /> New Game
      </Button>
    </div>
  );
};

export default TicTacToe;
