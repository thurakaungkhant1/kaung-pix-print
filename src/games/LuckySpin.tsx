import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

const PRIZES = [5, 10, 15, 20, 25, 50, 0, 30];
const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(168, 76%, 30%)", "hsl(15, 80%, 50%)",
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(168, 76%, 30%)", "hsl(15, 80%, 50%)",
];

interface Props { onWin: (points: number) => void; disabled?: boolean; }

const LuckySpin = ({ onWin, disabled }: Props) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);
    setResult(null);
    const winIdx = Math.floor(Math.random() * PRIZES.length);
    const segAngle = 360 / PRIZES.length;
    const targetAngle = 360 * 5 + (360 - winIdx * segAngle - segAngle / 2);
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(PRIZES[winIdx]);
      onWin(PRIZES[winIdx]);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-64 h-64">
        {/* Arrow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-accent" />
        </div>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transition-transform duration-[3000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {PRIZES.map((prize, i) => {
            const angle = (360 / PRIZES.length) * i;
            const rad1 = (angle * Math.PI) / 180;
            const rad2 = ((angle + 360 / PRIZES.length) * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(rad1);
            const y1 = 100 + 95 * Math.sin(rad1);
            const x2 = 100 + 95 * Math.cos(rad2);
            const y2 = 100 + 95 * Math.sin(rad2);
            const midAngle = angle + 360 / PRIZES.length / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const tx = 100 + 60 * Math.cos(midRad);
            const ty = 100 + 60 * Math.sin(midRad);

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                  fill={COLORS[i]}
                  stroke="white"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                  transform={`rotate(${midAngle}, ${tx}, ${ty})`}
                >
                  {prize === 0 ? "💀" : `+${prize}`}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="18" fill="white" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--foreground))">SPIN</text>
        </svg>
      </div>

      {result !== null && (
        <p className="text-lg font-bold animate-bounce">
          {result > 0 ? `🎉 You won ${result} game points!` : "😅 Better luck next time!"}
        </p>
      )}

      <Button
        onClick={spin}
        disabled={spinning || disabled}
        className="btn-neon gap-2"
      >
        <Gift className="h-4 w-4" />
        {disabled ? "Already spun today" : spinning ? "Spinning..." : "Spin!"}
      </Button>
    </div>
  );
};

export default LuckySpin;
