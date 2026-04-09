import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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

  const checkWinner = (b: Cell[]): Cell => {
    for (const [a, bb, c] of LINES) {
      if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  const minimax = (b: Cell[], isMax: boolean): number => {
    const w = checkWinner(b);
    if (w === "O") return 1;
    if (w === "X") return -1;
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

    const winner = checkWinner(newBoard);
    if (winner || newBoard.every(c => c !== null)) {
      setBoard(newBoard);
      setGameOver(true);
      onGameEnd(winner === "X" ? 100 : 0, winner === "X");
      return;
    }

    // AI turn
    const afterAi = aiMove(newBoard);
    const aiWinner = checkWinner(afterAi);
    if (aiWinner || afterAi.every(c => c !== null)) {
      setBoard(afterAi);
      setGameOver(true);
      onGameEnd(aiWinner === "X" ? 100 : 0, aiWinner === "X");
      return;
    }
    setBoard(afterAi);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setIsX(true); setGameOver(false); };
  const winner = checkWinner(board);
  const isDraw = !winner && board.every(c => c !== null);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        {winner ? (
          <p className="text-lg font-bold text-primary">{winner === "X" ? "🎉 You Win!" : "AI Wins!"}</p>
        ) : isDraw ? (
          <p className="text-lg font-bold text-muted-foreground">Draw!</p>
        ) : (
          <p className="text-sm text-muted-foreground">{isX ? "Your turn (X)" : "AI thinking..."}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 w-fit">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-20 h-20 rounded-xl bg-card border-2 border-border/50 text-3xl font-bold
              hover:bg-primary/10 transition-all flex items-center justify-center
              active:scale-95 disabled:opacity-50"
            disabled={!!cell || gameOver}
          >
            <span className={cell === "X" ? "text-primary" : "text-accent"}>
              {cell}
            </span>
          </button>
        ))}
      </div>
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RotateCcw className="h-4 w-4" /> New Game
      </Button>
    </div>
  );
};

export default TicTacToe;
