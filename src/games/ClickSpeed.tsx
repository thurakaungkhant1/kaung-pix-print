import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MousePointerClick, RotateCcw } from "lucide-react";

interface Props { onGameEnd: (score: number, isWin: boolean) => void; }

const ClickSpeed = ({ onGameEnd }: Props) => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const start = () => {
    setClicks(0);
    setTimeLeft(10);
    setRunning(true);
    setFinished(false);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (finished) {
      onGameEnd(clicks, clicks >= 50);
    }
  }, [finished]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-8 text-center">
        <div>
          <p className="text-3xl font-bold text-primary">{clicks}</p>
          <p className="text-xs text-muted-foreground">Clicks</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-accent">{timeLeft}s</p>
          <p className="text-xs text-muted-foreground">Time</p>
        </div>
        {finished && (
          <div>
            <p className="text-3xl font-bold text-foreground">{(clicks / 10).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">CPS</p>
          </div>
        )}
      </div>

      {running ? (
        <button
          onClick={() => setClicks(c => c + 1)}
          className="w-48 h-48 rounded-full bg-primary/20 border-4 border-primary hover:bg-primary/30
            active:scale-95 transition-all flex flex-col items-center justify-center gap-2
            shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
        >
          <MousePointerClick className="h-12 w-12 text-primary" />
          <span className="text-primary font-bold text-lg">TAP!</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {finished && (
            <div className="text-center">
              <p className="text-xl font-bold">{clicks >= 50 ? "🎉 Amazing!" : clicks >= 30 ? "👍 Good job!" : "Keep practicing!"}</p>
              <p className="text-sm text-muted-foreground">{clicks} clicks in 10 seconds</p>
            </div>
          )}
          <Button onClick={start} className="btn-neon gap-2">
            <RotateCcw className="h-4 w-4" /> {finished ? "Try Again" : "Start!"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClickSpeed;
