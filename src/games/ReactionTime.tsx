import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

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
    timerRef.current = setTimeout(() => { startRef.current = Date.now(); setPhase("go"); }, 1000 + Math.random() * 4000);
  };

  const handleClick = () => {
    if (phase === "waiting") { startRound(); }
    else if (phase === "ready") { clearTimeout(timerRef.current); setPhase("tooEarly"); }
    else if (phase === "go") {
      const rt = Date.now() - startRef.current;
      setCurrentTime(rt);
      const newTimes = [...times, rt];
      setTimes(newTimes);
      if (newTimes.length >= 5) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        onGameEnd(Math.max(0, 500 - avg), avg < 300);
      }
      setPhase("result");
    } else { startRound(); }
  };

  const reset = () => { setTimes([]); setPhase("waiting"); setCurrentTime(0); };
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  const phaseConfig = {
    waiting: { bg: "bg-card border-border/50", content: <><Zap className="h-10 w-10 text-primary" /><p className="font-display font-bold text-lg mt-2">Tap to Start</p><p className="text-xs text-muted-foreground">5 rounds — test your reflexes!</p></> },
    ready: { bg: "bg-red-500/10 border-red-500/30", content: <><p className="text-3xl font-display font-bold text-red-500">Wait...</p><p className="text-sm text-muted-foreground mt-1">Tap when green!</p></> },
    go: { bg: "bg-green-500/15 border-green-500/40 shadow-[0_0_30px_hsl(120,70%,50%,0.15)]", content: <><p className="text-3xl font-display font-bold text-green-500">TAP NOW!</p></> },
    result: { bg: "bg-primary/5 border-primary/30", content: <><p className="text-4xl font-display font-bold text-primary">{currentTime}ms</p><p className="text-sm text-muted-foreground mt-1">{times.length < 5 ? "Tap to continue" : "Done!"}</p></> },
    tooEarly: { bg: "bg-red-500/5 border-red-500/20", content: <><p className="text-xl font-display font-bold text-red-500">Too early! 😅</p><p className="text-sm text-muted-foreground mt-1">Tap to retry</p></> },
  };

  const config = phaseConfig[phase];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3">
        <Badge variant="secondary" className="text-xs px-3 py-1.5">
          Round: <span className="font-bold ml-1">{Math.min(times.length + 1, 5)}/5</span>
        </Badge>
        {avg > 0 && (
          <Badge variant="secondary" className="text-xs px-3 py-1.5">
            Avg: <span className="font-bold text-primary ml-1">{avg}ms</span>
          </Badge>
        )}
      </div>

      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        className={`w-full max-w-xs h-48 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all
          border-2 ${config.bg} cursor-pointer`}
      >
        {config.content}
      </motion.button>

      {times.length > 0 && (
        <div className="flex gap-1.5 flex-wrap justify-center">
          {times.map((t, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 rounded-lg">{t}ms</Badge>
          ))}
        </div>
      )}

      {times.length >= 5 && (
        <Button onClick={reset} variant="outline" size="sm" className="gap-2 rounded-xl">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      )}
    </div>
  );
};

export default ReactionTime;
