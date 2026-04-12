import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const MazeRunner = ({ onGameEnd }: Props) => {
  const SIZE = 7;
  const [maze, setMaze] = useState<number[][]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [exitPos] = useState({ x: SIZE - 1, y: SIZE - 1 });
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const generateMaze = useCallback(() => {
    const m: number[][] = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
    // Simple maze: random walls
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if ((x === 0 && y === 0) || (x === SIZE-1 && y === SIZE-1)) continue;
        if (Math.random() < 0.25) m[y][x] = 1;
      }
    }
    // Ensure path exists (simple guarantee by clearing diagonal)
    for (let i = 0; i < SIZE; i++) { m[i][i] = 0; if (i+1 < SIZE) m[i][i+1] = 0; }
    setMaze(m);
    setPlayerPos({ x: 0, y: 0 });
    setMoves(0);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (gameOver) return;
    let { x, y } = playerPos;
    if (e.key === "ArrowUp" || e.key === "w") y--;
    else if (e.key === "ArrowDown" || e.key === "s") y++;
    else if (e.key === "ArrowLeft" || e.key === "a") x--;
    else if (e.key === "ArrowRight" || e.key === "d") x++;
    else return;
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || maze[y]?.[x] === 1) return;
    setPlayerPos({ x, y });
    setMoves(m => m + 1);
    if (x === exitPos.x && y === exitPos.y) {
      const pts = Math.max(10, 50 - moves * 2) + level * 10;
      setScore(s => s + pts);
      setLevel(l => l + 1);
      generateMaze();
    }
  }, [playerPos, maze, gameOver, moves, level, generateMaze, exitPos]);

  useEffect(() => { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }, [handleKey]);

  const movePlayer = (dx: number, dy: number) => {
    if (gameOver) return;
    let { x, y } = playerPos;
    x += dx; y += dy;
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || maze[y]?.[x] === 1) return;
    setPlayerPos({ x, y });
    setMoves(m => m + 1);
    if (x === exitPos.x && y === exitPos.y) {
      const pts = Math.max(10, 50 - moves * 2) + level * 10;
      setScore(s => s + pts);
      setLevel(l => l + 1);
      generateMaze();
    }
  };

  const start = () => { setStarted(true); setGameOver(false); setScore(0); setLevel(1); setMoves(0); setWon(false); generateMaze(); };
  const finish = () => { setGameOver(true); };

  if (!started) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏃</div>
      <h2 className="text-xl font-bold">Maze Runner</h2>
      <p className="text-sm text-muted-foreground">Navigate to the exit! Fewer moves = more points.</p>
      <Button onClick={start} size="lg" className="rounded-xl">Start Game</Button>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-5xl">🏃</div>
      <h2 className="text-xl font-bold">Done!</h2>
      <p className="text-sm text-muted-foreground">Levels completed: {level - 1}</p>
      <p className="text-3xl font-bold text-primary">{score} pts</p>
      <div className="flex gap-3">
        <Button onClick={start} className="rounded-xl">Play Again</Button>
        <Button variant="outline" onClick={() => onGameEnd(score, level > 3)} className="rounded-xl">Submit</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-bold">Score: {score}</span>
        <span className="text-sm text-muted-foreground">Level {level}</span>
        <Button size="sm" variant="outline" onClick={finish} className="h-7 text-xs rounded-lg">Finish</Button>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {maze.map((row, y) => row.map((cell, x) => (
          <div key={`${x}-${y}`}
            className={`w-9 h-9 rounded-md flex items-center justify-center text-lg
              ${playerPos.x === x && playerPos.y === y ? "bg-primary text-primary-foreground" :
                x === exitPos.x && y === exitPos.y ? "bg-green-500 text-white" :
                cell === 1 ? "bg-foreground/80" : "bg-muted border border-border/30"}`}>
            {playerPos.x === x && playerPos.y === y ? "🏃" : x === exitPos.x && y === exitPos.y ? "🚪" : ""}
          </div>
        )))}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => movePlayer(0, -1)}>↑</Button>
        <div />
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => movePlayer(-1, 0)}>←</Button>
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => movePlayer(0, 1)}>↓</Button>
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => movePlayer(1, 0)}>→</Button>
      </div>
    </div>
  );
};

export default MazeRunner;
