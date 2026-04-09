import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { useGamePoints } from "@/hooks/useGamePoints";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gamepad2, Trophy, Target, Flame, Gift, ArrowLeft,
  Zap, Brain, MousePointerClick, Grid3X3, Car, HelpCircle,
  Timer, WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lazy load games
const TicTacToe = lazy(() => import("@/games/TicTacToe"));
const SnakeGame = lazy(() => import("@/games/SnakeGame"));
const MemoryGame = lazy(() => import("@/games/MemoryGame"));
const Game2048 = lazy(() => import("@/games/Game2048"));
const ClickSpeed = lazy(() => import("@/games/ClickSpeed"));
const WhackAMole = lazy(() => import("@/games/WhackAMole"));
const ReactionTime = lazy(() => import("@/games/ReactionTime"));
const QuizGame = lazy(() => import("@/games/QuizGame"));
const FlappyBird = lazy(() => import("@/games/FlappyBird"));
const CarDodge = lazy(() => import("@/games/CarDodge"));
const LuckySpin = lazy(() => import("@/games/LuckySpin"));

const GAMES = [
  { id: "tic-tac-toe", name: "Tic Tac Toe", icon: Grid3X3, color: "text-blue-500", desc: "Classic strategy" },
  { id: "snake", name: "Snake", icon: Zap, color: "text-green-500", desc: "Eat & grow" },
  { id: "memory", name: "Memory Match", icon: Brain, color: "text-purple-500", desc: "Find pairs" },
  { id: "2048", name: "2048", icon: Grid3X3, color: "text-amber-500", desc: "Merge tiles" },
  { id: "click-speed", name: "Click Speed", icon: MousePointerClick, color: "text-red-500", desc: "10sec challenge" },
  { id: "whack-a-mole", name: "Whack-a-Mole", icon: Target, color: "text-orange-500", desc: "Hit the moles" },
  { id: "reaction", name: "Reaction Time", icon: Timer, color: "text-cyan-500", desc: "Test reflexes" },
  { id: "quiz", name: "Myanmar Quiz", icon: HelpCircle, color: "text-indigo-500", desc: "Test knowledge" },
  { id: "flappy", name: "Flappy Bird", icon: Gamepad2, color: "text-teal-500", desc: "Fly & dodge" },
  { id: "car-dodge", name: "Car Dodge", icon: Car, color: "text-rose-500", desc: "Avoid cars" },
];

const GameComponents: Record<string, React.ComponentType<{ onGameEnd: (score: number, isWin: boolean) => void }>> = {
  "tic-tac-toe": TicTacToe,
  "snake": SnakeGame,
  "memory": MemoryGame,
  "2048": Game2048,
  "click-speed": ClickSpeed,
  "whack-a-mole": WhackAMole,
  "reaction": ReactionTime,
  "quiz": QuizGame,
  "flappy": FlappyBird,
  "car-dodge": CarDodge,
};

const GamesPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();
  const { gamePoints, dailyEarned, dailyLimit, streak, canPlay, getCooldownRemaining, submitScore } = useGamePoints();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [hasSpunToday, setHasSpunToday] = useState(false);

  // Load leaderboard
  useEffect(() => {
    if (isOnline) {
      supabase
        .from("profiles")
        .select("id, name, avatar_url, game_points")
        .order("game_points", { ascending: false })
        .limit(10)
        .then(({ data }) => { if (data) setLeaderboard(data); });
    }
  }, [isOnline]);

  const handleGameEnd = async (gameName: string, score: number, isWin: boolean) => {
    if (!isOnline) {
      // Save locally for sync later
      const pending = JSON.parse(localStorage.getItem("pending_scores") || "[]");
      pending.push({ gameName, score, isWin, timestamp: Date.now() });
      localStorage.setItem("pending_scores", JSON.stringify(pending));
      toast({ title: "Score saved offline!", description: "Will sync when online." });
      return;
    }

    const result = await submitScore(gameName, score, isWin);
    if (result.cooldown) {
      const remaining = getCooldownRemaining(gameName);
      toast({ title: "Cooldown!", description: `Wait ${remaining}s before playing again.`, variant: "destructive" });
    } else if (result.dailyLimitReached) {
      toast({ title: "Daily limit reached!", description: `Max ${dailyLimit} game points per day.` });
    } else if (result.pointsEarned > 0) {
      toast({ title: `+${result.pointsEarned} Game Points! 🎮`, description: isWin ? "You won! Great job!" : "Nice try!" });
    }
  };

  const handleSpin = async (points: number) => {
    if (points > 0 && user && isOnline) {
      await supabase.from("profiles").update({ game_points: gamePoints + points }).eq("id", user.id);
      await supabase.from("game_scores").insert({
        user_id: user.id, game_name: "lucky-spin", score: points, points_earned: points, is_win: points > 0,
      });
    }
    setHasSpunToday(true);
  };

  // Active game view
  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame);
    const GameComponent = GameComponents[activeGame];

    return (
      <AnimatedPage>
        <MobileLayout>
          <div className="max-w-screen-xl mx-auto p-4 pb-24">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setActiveGame(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">{game?.name}</h1>
              {!canPlay(activeGame) && (
                <Badge variant="secondary" className="ml-auto">
                  Cooldown: {getCooldownRemaining(activeGame)}s
                </Badge>
              )}
            </div>
            <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
              <GameComponent onGameEnd={(score, isWin) => handleGameEnd(activeGame, score, isWin)} />
            </Suspense>
          </div>
        </MobileLayout>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <MobileLayout>
        {/* Hero Header */}
        <header className="hero-gaming relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-gaming opacity-30" />
          <div className="absolute top-4 right-4 w-40 h-40 bg-primary/30 rounded-full blur-[80px] animate-pulse" />
          <div className="relative z-10 p-4 pt-6 pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30 shadow-glow">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-extrabold text-foreground tracking-tight text-neon">
                Game Center
              </h1>
            </div>
            {!isOnline && (
              <div className="flex items-center justify-center gap-2 mt-2 px-3 py-1.5 bg-amber-500/20 rounded-full text-amber-600 text-xs font-medium">
                <WifiOff className="h-3.5 w-3.5" />
                Offline Mode - Scores will sync later
              </div>
            )}
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 pb-24">
          {/* Stats Bar */}
          {user && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Card className="card-neon p-3 text-center">
                <Gamepad2 className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold text-primary">{gamePoints}</p>
                <p className="text-[10px] text-muted-foreground">Game Points</p>
              </Card>
              <Card className="card-neon p-3 text-center">
                <Flame className="h-4 w-4 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold text-accent">{streak}</p>
                <p className="text-[10px] text-muted-foreground">Day Streak</p>
              </Card>
              <Card className="card-neon p-3 text-center">
                <Target className="h-4 w-4 mx-auto text-foreground mb-1" />
                <p className="text-lg font-bold">{dailyEarned}/{dailyLimit}</p>
                <p className="text-[10px] text-muted-foreground">Today</p>
              </Card>
            </div>
          )}

          <Tabs defaultValue="games" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-11 bg-card/50 border border-border/50">
              <TabsTrigger value="games" className="gap-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Gamepad2 className="h-3.5 w-3.5" /> Games
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Trophy className="h-3.5 w-3.5" /> Top 10
              </TabsTrigger>
              <TabsTrigger value="spin" className="gap-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                <Gift className="h-3.5 w-3.5" /> Lucky Spin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="games">
              {/* Daily Mission */}
              {user && streak >= 7 && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <p className="text-sm font-bold text-amber-600">🔥 7-Day Streak Bonus Active!</p>
                  <p className="text-xs text-muted-foreground">+50% bonus on all games</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {GAMES.map((game, i) => (
                  <Card
                    key={game.id}
                    onClick={() => setActiveGame(game.id)}
                    className="card-neon p-4 cursor-pointer hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-300 animate-stagger-in flex flex-col items-center gap-2 text-center"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="p-3 rounded-xl bg-primary/10">
                      <game.icon className={`h-6 w-6 ${game.color}`} />
                    </div>
                    <h3 className="text-sm font-bold">{game.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{game.desc}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      +5~35 pts
                    </Badge>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No data yet</p>
                ) : (
                  leaderboard.map((player, i) => (
                    <Card key={player.id} className="card-neon p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{player.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{player.game_points?.toLocaleString() || 0}</p>
                        <p className="text-[10px] text-muted-foreground">pts</p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="spin">
              <div className="flex flex-col items-center py-4">
                <h2 className="text-lg font-bold mb-4">🎰 Daily Lucky Spin</h2>
                <p className="text-sm text-muted-foreground mb-6">1 free spin per day!</p>
                <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />}>
                  <LuckySpin onWin={handleSpin} disabled={hasSpunToday} />
                </Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default GamesPortal;
