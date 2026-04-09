import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, RotateCcw } from "lucide-react";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

type Phase = "waiting" | "ready" | "go" | "result" | "tooEarly";

const ReactionTime = ({ onGameEnd }: Props) => {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const startRound = () => {
    setPhase("ready");
    const delay = 1000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase("go");
    }, delay);
  };

  const handleClick = () => {
    if (phase === "waiting") {
      startRound();
    } else if (phase === "ready") {
      clearTimeout(timerRef.current);
      setPhase("tooEarly");
    } else if (phase === "go") {
      const rt = Date.now() - startRef.current;
      setCurrentTime(rt);
      const newTimes = [...times, rt];
      setTimes(newTimes);
      if (newTimes.length >= 5) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        const score = Math.max(0, 500 - avg);
        onGameEnd(score, avg < 300);
      }
      setPhase("result");
    } else {
      startRound();
    }
  };

  const reset = () => { setTimes([]); setPhase("waiting"); setCurrentTime(0); };
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  const bgColor = {
    waiting: "bg-card",
    ready: "bg-red-500/20",
    go: "bg-green-500/20",
    result: "bg-primary/10",
    tooEarly: "bg-red-500/10",
  }[phase];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-sm">
        <span>Round: <span className="font-bold">{Math.min(times.length + 1, 5)}/5</span></span>
        {avg > 0 && <span>Avg: <span className="font-bold text-primary">{avg}ms</span></span>}
      </div>

      <button
        onClick={handleClick}
        className={`w-64 h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all
          border-2 border-border/50 ${bgColor} active:scale-95`}
      >
        {phase === "waiting" && <><Zap className="h-10 w-10 text-primary" /><p className="font-bold">Tap to Start</p></>}
        {phase === "ready" && <><p className="text-2xl font-bold text-red-500">Wait...</p><p className="text-sm text-muted-foreground">Tap when green!</p></>}
        {phase === "go" && <><p className="text-3xl font-bold text-green-500">TAP NOW!</p></>}
        {phase === "result" && <><p className="text-3xl font-bold text-primary">{currentTime}ms</p><p className="text-sm text-muted-foreground">{times.length < 5 ? "Tap to continue" : "Done!"}</p></>}
        {phase === "tooEarly" && <><p className="text-xl font-bold text-red-500">Too early! 😅</p><p className="text-sm text-muted-foreground">Tap to retry</p></>}
      </button>

      {times.length > 0 && (
        <div className="flex gap-2">
          {times.map((t, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{t}ms</span>
          ))}
        </div>
      )}

      {times.length >= 5 && (
        <Button onClick={reset} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      )}
    </div>
  );
};

export default ReactionTime;
