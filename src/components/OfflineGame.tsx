import { useState, useEffect, useRef, useCallback } from "react";
import { WifiOff, RotateCcw, Volume2, VolumeX, Trophy, Zap, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "jump" | "land" | "score" | "crash" | "trail";
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  play(type: "jump" | "land" | "score" | "crash" | "milestone") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch (type) {
        case "jump":
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now); osc.stop(now + 0.15);
          break;
        case "land":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now); osc.stop(now + 0.1);
          break;
        case "score":
          osc.type = "sine";
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.05);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now); osc.stop(now + 0.12);
          break;
        case "crash":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now); osc.stop(now + 0.4);
          break;
        case "milestone":
          osc.type = "sine";
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.08);
          osc.frequency.setValueAtTime(784, now + 0.16);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now); osc.stop(now + 0.3);
          break;
      }
    } catch {}
  }
}

const soundEngine = new SoundEngine();

const OfflineGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem("kaung_offline_highscore") || "0")
  );
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const gameState = useRef({
    playerY: GROUND_Y - 30,
    playerVelocity: 0,
    isJumping: false,
    wasJumping: false,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    score: 0,
    gameSpeed: GAME_SPEED_INITIAL,
    frameCount: 0,
    isRunning: false,
    playerFrame: 0,
    lastMilestone: 0,
  });

  const spawnParticles = useCallback((x: number, y: number, count: number, type: Particle["type"], color: string) => {
    const state = gameState.current;
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === "crash" ? 6 : 3),
        vy: (Math.random() - 1) * (type === "crash" ? 5 : 2),
        life: type === "trail" ? 10 : 20 + Math.random() * 20,
        maxLife: type === "trail" ? 10 : 20 + Math.random() * 20,
        size: type === "crash" ? 2 + Math.random() * 4 : 1 + Math.random() * 3,
        color, type,
      });
    }
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, y: number, frame: number) => {
    const x = 50;
    ctx.fillStyle = "hsl(var(--primary))";
    ctx.fillRect(x, y, 24, 20);
    ctx.fillStyle = "hsl(var(--primary-foreground))";
    ctx.fillRect(x + 3, y + 3, 18, 12);
    ctx.shadowColor = "hsl(var(--primary))";
    ctx.shadowBlur = 4;
    ctx.fillRect(x + 3, y + 3, 18, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "hsl(var(--primary))";
    ctx.fillRect(x + 8, y + 20, 8, 4);
    ctx.fillRect(x + 5, y + 24, 14, 3);
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

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 30);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y + 30);
    ctx.stroke();

    ctx.fillStyle = "hsl(var(--muted-foreground))";
    for (let i = 0; i < 20; i++) {
      const dotX = ((i * 25 - state.frameCount * state.gameSpeed * 0.5) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      ctx.fillRect(dotX, GROUND_Y + 32, 2, 1);
    }

    state.playerVelocity += GRAVITY;
    state.playerY += state.playerVelocity;

    if (state.isJumping && state.frameCount % 3 === 0) {
      spawnParticles(55, state.playerY + 30, 1, "trail", "hsl(var(--primary))");
    }

    if (state.playerY >= GROUND_Y - 30) {
      state.playerY = GROUND_Y - 30;
      if (state.wasJumping && state.playerVelocity > 0) {
        soundEngine.play("land");
        spawnParticles(62, GROUND_Y, 5, "land", "hsl(var(--muted-foreground))");
      }
      state.playerVelocity = 0;
      state.isJumping = false;
    }
    state.wasJumping = state.isJumping;
    state.frameCount++;
    if (state.frameCount % 8 === 0) state.playerFrame++;

    if (state.frameCount % Math.max(60, 120 - Math.floor(state.score / 5)) === 0) {
      const types: Obstacle["type"][] = ["monitor", "keyboard", "mouse"];
      const type = types[Math.floor(Math.random() * types.length)];
      const sizes = { monitor: { w: 25, h: 30 }, keyboard: { w: 30, h: 15 }, mouse: { w: 14, h: 20 } };
      state.obstacles.push({ x: CANVAS_WIDTH + 20, width: sizes[type].w, height: sizes[type].h, type });
    }

    state.obstacles = state.obstacles.filter((obs) => {
      obs.x -= state.gameSpeed;
      return obs.x > -50;
    });

    const playerBox = { x: 50, y: state.playerY, w: 24, h: 30 };
    for (const obs of state.obstacles) {
      const obsBox = { x: obs.x, y: GROUND_Y - obs.height, w: obs.width, h: obs.height };
      if (playerBox.x < obsBox.x + obsBox.w && playerBox.x + playerBox.w > obsBox.x &&
          playerBox.y < obsBox.y + obsBox.h && playerBox.y + playerBox.h > obsBox.y) {
        state.isRunning = false;
        soundEngine.play("crash");
        spawnParticles(62, state.playerY + 15, 20, "crash", "hsl(var(--destructive))");
        spawnParticles(obs.x + obs.width / 2, GROUND_Y - obs.height / 2, 10, "crash", "hsl(var(--primary))");
        const newHigh = Math.max(state.score, highScore);
        setHighScore(newHigh);
        localStorage.setItem("kaung_offline_highscore", String(newHigh));
        const pending = JSON.parse(localStorage.getItem("kaung_offline_pending_scores") || "[]");
        pending.push({ score: state.score, timestamp: Date.now() });
        localStorage.setItem("kaung_offline_pending_scores", JSON.stringify(pending));
        setGameOver(true);
        drawPlayer(ctx, state.playerY, state.playerFrame);
        state.obstacles.forEach((o) => drawObstacle(ctx, o));
        return;
      }
    }

    if (state.frameCount % 10 === 0) {
      state.score++;
      setScore(state.score);
      if (state.score % 50 === 0 && state.score > 0) {
        soundEngine.play("score");
        spawnParticles(62, state.playerY, 8, "score", "hsl(var(--accent))");
      }
      if (state.score % 100 === 0 && state.score > state.lastMilestone) {
        state.lastMilestone = state.score;
        soundEngine.play("milestone");
        for (let i = 0; i < 15; i++) {
          const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))"];
          spawnParticles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 1, "score", colors[i % 3]);
        }
      }
    }
    state.gameSpeed = GAME_SPEED_INITIAL + state.score * GAME_SPEED_INCREMENT;

    state.particles = state.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === "score") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      return p.life > 0;
    });

    drawPlayer(ctx, state.playerY, state.playerFrame);
    state.obstacles.forEach((obs) => drawObstacle(ctx, obs));

    ctx.fillStyle = "hsl(var(--foreground))";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(state.score).padStart(5, "0"), CANVAS_WIDTH - 10, 20);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [drawPlayer, drawObstacle, highScore, spawnParticles]);

  const jump = useCallback(() => {
    if (!gameState.current.isRunning) {
      startGame();
      return;
    }
    if (!gameState.current.isJumping) {
      gameState.current.playerVelocity = JUMP_FORCE;
      gameState.current.isJumping = true;
      gameState.current.wasJumping = true;
      soundEngine.play("jump");
      spawnParticles(55, GROUND_Y, 4, "jump", "hsl(var(--primary))");
    }
  }, [spawnParticles]);

  const startGame = useCallback(() => {
    const state = gameState.current;
    state.playerY = GROUND_Y - 30;
    state.playerVelocity = 0;
    state.isJumping = false;
    state.wasJumping = false;
    state.obstacles = [];
    state.particles = [];
    state.score = 0;
    state.gameSpeed = GAME_SPEED_INITIAL;
    state.frameCount = 0;
    state.isRunning = true;
    state.lastMilestone = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const toggleSound = useCallback(() => {
    soundEngine.muted = !soundEngine.muted;
    setSoundOn(!soundEngine.muted);
  }, []);

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Glassmorphism background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 backdrop-blur-sm border border-primary/20 mb-4 shadow-lg">
          <WifiOff className="w-9 h-9 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">
          အင်တာနက် မရှိပါ
        </h1>
        <p className="text-sm text-muted-foreground">No Internet Connection</p>
      </motion.div>

      {/* Game Container - Glassmorphism */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative w-full max-w-md z-10"
      >
        <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden">
          {/* Game Header */}
          <div className="flex justify-between items-center px-5 py-3 border-b border-border/30 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Gamepad2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground tracking-wide">KAUNG RUNNER</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSound}
                className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                <Trophy className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">{String(highScore).padStart(5, "0")}</span>
              </div>
            </div>
          </div>

          {/* Score Display */}
          {gameStarted && (
            <div className="flex justify-center py-2 bg-muted/20">
              <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/15">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-sm font-mono font-bold text-foreground">{String(score).padStart(5, "0")}</span>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="px-4 py-3">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full rounded-2xl bg-background/80 border border-border/30 cursor-pointer shadow-inner"
              onClick={jump}
              onTouchStart={(e) => { e.preventDefault(); jump(); }}
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* Start Overlay */}
          <AnimatePresence>
            {!gameStarted && !gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-md rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="text-center px-8"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🖥️</span>
                  </div>
                  <p className="text-base font-display font-bold text-foreground mb-1">Kaung Runner</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Monitor, Keyboard, Mouse တွေကို ခုန်ကျော်ပါ!
                  </p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-pulse">
                    <span>Tap or Space to Start</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-md rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-center px-8"
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-destructive/15 border border-destructive/20 flex items-center justify-center">
                    <span className="text-3xl">💥</span>
                  </div>
                  <p className="text-lg font-display font-bold text-foreground mb-1">GAME OVER</p>
                  <p className="text-4xl font-mono font-black text-primary mb-1">{score}</p>
                  {score >= highScore && score > 0 && (
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-bold text-accent mb-2"
                    >
                      🏆 New High Score!
                    </motion.p>
                  )}
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Online ပြန်ဖြစ်ရင် points sync လုပ်ပါမယ်
                  </p>
                  <button
                    onClick={startGame}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-all shadow-lg hover:shadow-xl"
                  >
                    <RotateCcw className="w-4 h-4" />
                    ထပ်ကစားမယ်
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips Footer */}
          <div className="px-5 py-3 border-t border-border/30 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[10px] text-muted-foreground">Offline Mode</span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                Space / Tap to Jump
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-muted-foreground/60 text-center max-w-[300px] relative z-10"
      >
        အင်တာနက် ပြန်ရရင် အလိုအလျောက် ပြန်သွားပါမယ်
      </motion.p>
    </div>
  );
};

export default OfflineGame;
