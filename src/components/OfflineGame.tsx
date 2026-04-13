import { useState, useEffect, useRef, useCallback } from "react";
import { WifiOff, RotateCcw } from "lucide-react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 200;
const GROUND_Y = 160;
const GRAVITY = 0.6;
const JUMP_FORCE = -11;
const GAME_SPEED_INITIAL = 4;
const GAME_SPEED_INCREMENT = 0.001;

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: "monitor" | "keyboard" | "mouse";
}

const OfflineGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("kaung_offline_highscore") || "0");
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameState = useRef({
    playerY: GROUND_Y - 30,
    playerVelocity: 0,
    isJumping: false,
    obstacles: [] as Obstacle[],
    score: 0,
    gameSpeed: GAME_SPEED_INITIAL,
    frameCount: 0,
    isRunning: false,
    playerFrame: 0,
  });

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, y: number, frame: number) => {
    const x = 50;
    // Simple character: a little PC mascot
    ctx.fillStyle = "hsl(var(--primary))";
    // Body (monitor shape)
    ctx.fillRect(x, y, 24, 20);
    ctx.fillStyle = "hsl(var(--primary-foreground))";
    ctx.fillRect(x + 3, y + 3, 18, 12);
    // Stand
    ctx.fillStyle = "hsl(var(--primary))";
    ctx.fillRect(x + 8, y + 20, 8, 4);
    ctx.fillRect(x + 5, y + 24, 14, 3);
    // Legs (animated)
    ctx.fillStyle = "hsl(var(--foreground))";
    if (gameState.current.isJumping) {
      ctx.fillRect(x + 4, y + 27, 4, 3);
      ctx.fillRect(x + 16, y + 27, 4, 3);
    } else {
      const legOffset = frame % 2 === 0 ? 0 : 3;
      ctx.fillRect(x + 4, y + 27, 4, 3 + legOffset);
      ctx.fillRect(x + 16, y + 27, 4, 3 + (legOffset ? 0 : 3));
    }
  }, []);

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    ctx.fillStyle = "hsl(var(--destructive))";
    const y = GROUND_Y - obs.height;
    if (obs.type === "monitor") {
      ctx.fillRect(obs.x, y, obs.width, obs.height - 5);
      ctx.fillStyle = "hsl(var(--destructive-foreground))";
      ctx.fillRect(obs.x + 3, y + 3, obs.width - 6, obs.height - 14);
      ctx.fillStyle = "hsl(var(--destructive))";
      ctx.fillRect(obs.x + obs.width / 2 - 3, y + obs.height - 5, 6, 3);
      ctx.fillRect(obs.x + obs.width / 2 - 6, y + obs.height - 2, 12, 2);
    } else if (obs.type === "keyboard") {
      ctx.fillRect(obs.x, y + 5, obs.width, obs.height - 5);
      ctx.fillStyle = "hsl(var(--destructive-foreground))";
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillRect(obs.x + 3 + c * 7, y + 8 + r * 6, 5, 4);
        }
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.width / 2, y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(var(--destructive-foreground))";
      ctx.fillRect(obs.x + obs.width / 2 - 1, y + 4, 2, obs.height / 3);
    }
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = gameState.current;
    if (!state.isRunning) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Ground
    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 30);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y + 30);
    ctx.stroke();

    // Ground dots
    ctx.fillStyle = "hsl(var(--muted-foreground))";
    for (let i = 0; i < 20; i++) {
      const dotX = ((i * 25 - state.frameCount * state.gameSpeed * 0.5) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      ctx.fillRect(dotX, GROUND_Y + 32, 2, 1);
    }

    // Update player
    state.playerVelocity += GRAVITY;
    state.playerY += state.playerVelocity;
    if (state.playerY >= GROUND_Y - 30) {
      state.playerY = GROUND_Y - 30;
      state.playerVelocity = 0;
      state.isJumping = false;
    }

    // Update animation frame
    state.frameCount++;
    if (state.frameCount % 8 === 0) state.playerFrame++;

    // Spawn obstacles
    if (state.frameCount % Math.max(60, 120 - Math.floor(state.score / 5)) === 0) {
      const types: Obstacle["type"][] = ["monitor", "keyboard", "mouse"];
      const type = types[Math.floor(Math.random() * types.length)];
      const sizes = {
        monitor: { w: 25, h: 30 },
        keyboard: { w: 30, h: 15 },
        mouse: { w: 14, h: 20 },
      };
      state.obstacles.push({
        x: CANVAS_WIDTH + 20,
        width: sizes[type].w,
        height: sizes[type].h,
        type,
      });
    }

    // Update obstacles
    state.obstacles = state.obstacles.filter((obs) => {
      obs.x -= state.gameSpeed;
      return obs.x > -50;
    });

    // Collision detection
    const playerBox = { x: 50, y: state.playerY, w: 24, h: 30 };
    for (const obs of state.obstacles) {
      const obsBox = { x: obs.x, y: GROUND_Y - obs.height, w: obs.width, h: obs.height };
      if (
        playerBox.x < obsBox.x + obsBox.w &&
        playerBox.x + playerBox.w > obsBox.x &&
        playerBox.y < obsBox.y + obsBox.h &&
        playerBox.y + playerBox.h > obsBox.y
      ) {
        state.isRunning = false;
        const newHigh = Math.max(state.score, highScore);
        setHighScore(newHigh);
        localStorage.setItem("kaung_offline_highscore", String(newHigh));
        setGameOver(true);
        return;
      }
    }

    // Score
    if (state.frameCount % 10 === 0) {
      state.score++;
      setScore(state.score);
    }
    state.gameSpeed = GAME_SPEED_INITIAL + state.score * GAME_SPEED_INCREMENT;

    // Draw
    drawPlayer(ctx, state.playerY, state.playerFrame);
    state.obstacles.forEach((obs) => drawObstacle(ctx, obs));

    // Score display on canvas
    ctx.fillStyle = "hsl(var(--foreground))";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(state.score).padStart(5, "0"), CANVAS_WIDTH - 10, 20);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [drawPlayer, drawObstacle, highScore]);

  const jump = useCallback(() => {
    if (!gameState.current.isRunning) {
      if (gameOver) restart();
      else startGame();
      return;
    }
    if (!gameState.current.isJumping) {
      gameState.current.playerVelocity = JUMP_FORCE;
      gameState.current.isJumping = true;
    }
  }, [gameOver]);

  const startGame = useCallback(() => {
    const state = gameState.current;
    state.playerY = GROUND_Y - 30;
    state.playerVelocity = 0;
    state.isJumping = false;
    state.obstacles = [];
    state.score = 0;
    state.gameSpeed = GAME_SPEED_INITIAL;
    state.frameCount = 0;
    state.isRunning = true;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const restart = useCallback(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [jump]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 select-none">
      <div className="text-center mb-6">
        <WifiOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
        <h1 className="text-2xl font-bold text-foreground mb-1">အင်တာနက် မရှိပါ</h1>
        <p className="text-sm text-muted-foreground">No Internet Connection</p>
      </div>

      <div className="relative bg-card rounded-2xl border border-border p-4 shadow-lg max-w-full overflow-hidden">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-bold text-primary">🖥️ KAUNG COMPUTER</span>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>HI {String(highScore).padStart(5, "0")}</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full max-w-[400px] rounded-lg bg-background border border-border cursor-pointer"
          onClick={jump}
          onTouchStart={(e) => {
            e.preventDefault();
            jump();
          }}
          style={{ imageRendering: "pixelated" }}
        />

        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">🖥️</div>
              <p className="text-sm font-semibold text-foreground mb-1">Tap or Space to Start</p>
              <p className="text-xs text-muted-foreground">Monitor, Keyboard, Mouse တွေကို ခုန်ကျော်ပါ!</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-2xl">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground mb-1">GAME OVER</p>
              <p className="text-2xl font-bold text-primary mb-2">{score}</p>
              <button
                onClick={restart}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4" />
                ထပ်ကစားမယ်
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground text-center max-w-[300px]">
        အင်တာနက် ပြန်ရရင် အလိုအလျောက် ပြန်သွားပါမယ်
      </p>
    </div>
  );
};

export default OfflineGame;
