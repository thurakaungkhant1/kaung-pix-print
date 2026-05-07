import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";
import AnimatedSection from "@/components/animations/AnimatedSection";
import { useGamePoints } from "@/hooks/useGamePoints";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Gamepad2, Trophy, Target, Flame, Gift, ArrowLeft,
  Zap, Brain, MousePointerClick, Grid3X3, Car, HelpCircle,
  Timer, WifiOff, Star, Sparkles, ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

// Lazy load all games
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
const ColorMatch = lazy(() => import("@/games/ColorMatch"));
const WordScramble = lazy(() => import("@/games/WordScramble"));
const MathChallenge = lazy(() => import("@/games/MathChallenge"));
const SimonSays = lazy(() => import("@/games/SimonSays"));
const BubblePop = lazy(() => import("@/games/BubblePop"));
const TypingRace = lazy(() => import("@/games/TypingRace"));
const NumberGuess = lazy(() => import("@/games/NumberGuess"));
const RockPaperScissors = lazy(() => import("@/games/RockPaperScissors"));
const PatternRecall = lazy(() => import("@/games/PatternRecall"));
const CoinFlip = lazy(() => import("@/games/CoinFlip"));
const EmojiMatch = lazy(() => import("@/games/EmojiMatch"));
const TargetShoot = lazy(() => import("@/games/TargetShoot"));
const FlagQuiz = lazy(() => import("@/games/FlagQuiz"));
const PianoTiles = lazy(() => import("@/games/PianoTiles"));
const FruitCatch = lazy(() => import("@/games/FruitCatch"));
const HiLo = lazy(() => import("@/games/HiLo"));
const MazeRunner = lazy(() => import("@/games/MazeRunner"));
const JumpRunner = lazy(() => import("@/games/JumpRunner"));
const SpotDifference = lazy(() => import("@/games/SpotDifference"));
const TowerStack = lazy(() => import("@/games/TowerStack"));

const GAMES = [
  { id: "tic-tac-toe", name: "Tic Tac Toe", emoji: "🎯", gradient: "from-blue-500 to-cyan-500", desc: "Classic strategy", tag: "Popular" },
  { id: "snake", name: "Snake", emoji: "🐍", gradient: "from-green-500 to-emerald-500", desc: "Eat & grow", tag: "Classic" },
  { id: "memory", name: "Memory Match", emoji: "🧠", gradient: "from-purple-500 to-violet-500", desc: "Find pairs", tag: "Brain" },
  { id: "2048", name: "2048", emoji: "🧮", gradient: "from-amber-500 to-orange-500", desc: "Merge tiles", tag: "Puzzle" },
  { id: "click-speed", name: "Click Speed", emoji: "👆", gradient: "from-red-500 to-rose-500", desc: "10sec challenge", tag: "Speed" },
  { id: "whack-a-mole", name: "Whack-a-Mole", emoji: "🐹", gradient: "from-orange-500 to-amber-500", desc: "Hit the moles", tag: "Action" },
  { id: "reaction", name: "Reaction Time", emoji: "⚡", gradient: "from-cyan-500 to-teal-500", desc: "Test reflexes", tag: "Speed" },
  { id: "quiz", name: "Myanmar Quiz", emoji: "❓", gradient: "from-indigo-500 to-blue-500", desc: "Test knowledge", tag: "Quiz" },
  { id: "flappy", name: "Flappy Bird", emoji: "🐦", gradient: "from-teal-500 to-green-500", desc: "Fly & dodge", tag: "Arcade" },
  { id: "car-dodge", name: "Car Dodge", emoji: "🏎️", gradient: "from-rose-500 to-pink-500", desc: "Avoid cars", tag: "Arcade" },
  { id: "color-match", name: "Color Match", emoji: "🎨", gradient: "from-pink-500 to-fuchsia-500", desc: "Match colors", tag: "Brain" },
  { id: "word-scramble", name: "Word Scramble", emoji: "🔤", gradient: "from-violet-500 to-purple-500", desc: "Unscramble", tag: "Word" },
  { id: "math", name: "Math Challenge", emoji: "➕", gradient: "from-emerald-500 to-teal-500", desc: "Quick math", tag: "Brain" },
  { id: "simon", name: "Simon Says", emoji: "🔴", gradient: "from-red-500 to-orange-500", desc: "Follow pattern", tag: "Memory" },
  { id: "bubble-pop", name: "Bubble Pop", emoji: "🫧", gradient: "from-sky-500 to-blue-500", desc: "Pop bubbles", tag: "Action" },
  { id: "typing", name: "Typing Race", emoji: "⌨️", gradient: "from-slate-500 to-gray-500", desc: "Type fast", tag: "Speed" },
  { id: "number-guess", name: "Number Guess", emoji: "🔢", gradient: "from-lime-500 to-green-500", desc: "Guess right", tag: "Logic" },
  { id: "rps", name: "Rock Paper Scissors", emoji: "✂️", gradient: "from-stone-500 to-zinc-500", desc: "Beat CPU", tag: "Classic" },
  { id: "pattern", name: "Pattern Recall", emoji: "🧩", gradient: "from-fuchsia-500 to-pink-500", desc: "Remember tiles", tag: "Memory" },
  { id: "coin-flip", name: "Coin Flip", emoji: "🪙", gradient: "from-yellow-500 to-amber-500", desc: "Heads or tails", tag: "Luck" },
  { id: "emoji-match", name: "Emoji Match", emoji: "😀", gradient: "from-orange-400 to-red-500", desc: "Find emojis", tag: "Speed" },
  { id: "target-shoot", name: "Target Shoot", emoji: "🎯", gradient: "from-red-600 to-rose-500", desc: "Hit targets", tag: "Action" },
  { id: "flag-quiz", name: "Flag Quiz", emoji: "🏳️", gradient: "from-blue-600 to-indigo-500", desc: "Guess country", tag: "Quiz" },
  { id: "piano-tiles", name: "Piano Tiles", emoji: "🎹", gradient: "from-gray-600 to-zinc-500", desc: "Tap tiles", tag: "Rhythm" },
  { id: "fruit-catch", name: "Fruit Catch", emoji: "🧺", gradient: "from-green-600 to-lime-500", desc: "Catch fruits", tag: "Arcade" },
  { id: "hilo", name: "Hi-Lo Cards", emoji: "🃏", gradient: "from-emerald-600 to-green-500", desc: "Higher or lower", tag: "Luck" },
  { id: "maze", name: "Maze Runner", emoji: "🏃", gradient: "from-amber-600 to-yellow-500", desc: "Find the exit", tag: "Puzzle" },
  { id: "jump", name: "Jump Runner", emoji: "🦘", gradient: "from-sky-600 to-cyan-500", desc: "Jump & run", tag: "Arcade" },
  { id: "spot-diff", name: "Spot Difference", emoji: "🔍", gradient: "from-violet-600 to-indigo-500", desc: "Find odd one", tag: "Brain" },
  { id: "tower", name: "Tower Stack", emoji: "🏗️", gradient: "from-orange-600 to-red-500", desc: "Stack blocks", tag: "Arcade" },
];

const GameComponents: Record<string, React.ComponentType<{ onGameEnd: (score: number, isWin: boolean) => void }>> = {
  "tic-tac-toe": TicTacToe, snake: SnakeGame, memory: MemoryGame, "2048": Game2048,
  "click-speed": ClickSpeed, "whack-a-mole": WhackAMole, reaction: ReactionTime,
  quiz: QuizGame, flappy: FlappyBird, "car-dodge": CarDodge,
  "color-match": ColorMatch, "word-scramble": WordScramble, math: MathChallenge,
  simon: SimonSays, "bubble-pop": BubblePop, typing: TypingRace,
  "number-guess": NumberGuess, rps: RockPaperScissors, pattern: PatternRecall,
  "coin-flip": CoinFlip, "emoji-match": EmojiMatch, "target-shoot": TargetShoot,
  "flag-quiz": FlagQuiz, "piano-tiles": PianoTiles, "fruit-catch": FruitCatch,
  hilo: HiLo, maze: MazeRunner, jump: JumpRunner, "spot-diff": SpotDifference,
  tower: TowerStack,
};

interface RewardItem {
  id: string; name: string; description: string | null; emoji: string | null;
  cost_points: number; reward_type: string; reward_value: number;
}

const GamesPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();
  const { gamePoints, dailyEarned, dailyLimit, streak, canPlay, getCooldownRemaining, submitScore, refreshData } = useGamePoints();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [filter, setFilter] = useState("All");
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const TAGS = ["All", ...Array.from(new Set(GAMES.map(g => g.tag)))];

  useEffect(() => {
    if (isOnline) {
      supabase.from("profiles").select("id, name, avatar_url, game_points")
        .order("game_points", { ascending: false }).limit(10)
        .then(({ data }) => { if (data) setLeaderboard(data); });
    }
  }, [isOnline]);

  const handleGameEnd = async (gameName: string, score: number, isWin: boolean) => {
    if (!isOnline) {
      const pending = JSON.parse(localStorage.getItem("pending_scores") || "[]");
      pending.push({ gameName, score, isWin, timestamp: Date.now() });
      localStorage.setItem("pending_scores", JSON.stringify(pending));
      toast({ title: "Score saved offline!", description: "Will sync when online." });
      return;
    }
    const result = await submitScore(gameName, score, isWin);
    if (result.cooldown) {
      toast({ title: "Cooldown!", description: `Wait ${getCooldownRemaining(gameName)}s`, variant: "destructive" });
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

  const handleRedeem = async (reward: typeof REWARDS[0]) => {
    if (!user || redeeming) return;
    if (gamePoints < reward.cost) {
      toast({ title: "Not enough points!", description: `You need ${reward.cost} game points.`, variant: "destructive" });
      return;
    }
    setRedeeming(reward.id);
    try {
      const newPoints = gamePoints - reward.cost;
      await supabase.from("profiles").update({ game_points: newPoints }).eq("id", user.id);
      
      // If it's a shop points conversion
      if (reward.emoji === "🪙") {
        const shopPoints = reward.name.includes("500") ? 500 : 1000;
        const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single();
        if (profile) {
          await supabase.from("profiles").update({ points: profile.points + shopPoints }).eq("id", user.id);
          await supabase.from("point_transactions").insert({
            user_id: user.id, amount: shopPoints, transaction_type: "game_reward",
            description: `Converted ${reward.cost} game points to ${shopPoints} shop coins`,
          });
        }
      }

      toast({ title: "🎉 Reward Redeemed!", description: `${reward.name} — check your account!` });
      refreshData();
    } catch {
      toast({ title: "Redemption failed", variant: "destructive" });
    }
    setRedeeming(null);
  };

  const filteredGames = filter === "All" ? GAMES : GAMES.filter(g => g.tag === filter);

  // Active game view
  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame);
    const GameComponent = GameComponents[activeGame];

    return (
      <AnimatedPage>
        <MobileLayout>
          <div className="max-w-screen-xl mx-auto p-4 pb-24">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveGame(null)} className="rounded-xl h-10 w-10 bg-card border border-border/50">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-display font-bold">{game?.emoji} {game?.name}</h1>
                <p className="text-[11px] text-muted-foreground">{game?.desc}</p>
              </div>
              {!canPlay(activeGame) && (
                <Badge variant="secondary" className="text-xs">⏱ {getCooldownRemaining(activeGame)}s</Badge>
              )}
            </div>
            <Card className="p-4 sm:p-6 rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading game...</p>
                </div>
              }>
                <GameComponent onGameEnd={(score, isWin) => handleGameEnd(activeGame, score, isWin)} />
              </Suspense>
            </Card>
          </div>
        </MobileLayout>
      </AnimatedPage>
    );
  }

  const dailyProgress = dailyLimit > 0 ? (dailyEarned / dailyLimit) * 100 : 0;

  return (
    <AnimatedPage>
      <MobileLayout>
        {/* Hero Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary-foreground/5 rounded-full blur-2xl" />
          <div className="relative z-10 p-5 pt-8 pb-6">
            <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground/60" />
                  <span className="text-[10px] font-medium text-primary-foreground/50 uppercase tracking-widest">Play & Earn</span>
                </div>
                <h1 className="text-2xl font-display font-black text-primary-foreground tracking-tight">Game Center</h1>
                <p className="text-xs text-primary-foreground/50 mt-0.5">30 games • Win points • Get rewards</p>
              </div>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
                className="p-3 bg-primary-foreground/10 rounded-2xl backdrop-blur-md border border-primary-foreground/10">
                <Gamepad2 className="h-7 w-7 text-primary-foreground/80" />
              </motion.div>
            </motion.div>
            {!isOnline && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="flex items-center justify-center gap-2 mt-3 px-3 py-2 bg-amber-500/20 rounded-xl text-amber-200 text-xs font-medium border border-amber-500/20">
                <WifiOff className="h-3.5 w-3.5" />Offline Mode — Scores sync when online
              </motion.div>
            )}
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 pb-24 space-y-4">
          {/* Stats */}
          {user && (
            <AnimatedSection>
              <div className="grid grid-cols-3 gap-2.5">
                <Card className="p-3 text-center rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-primary/10 w-fit mx-auto mb-1.5"><Gamepad2 className="h-4 w-4 text-primary" /></div>
                  <p className="text-lg font-display font-bold text-primary">{gamePoints.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Game Points</p>
                </Card>
                <Card className="p-3 text-center rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-accent/10 w-fit mx-auto mb-1.5"><Flame className="h-4 w-4 text-accent" /></div>
                  <p className="text-lg font-display font-bold text-accent">{streak}</p>
                  <p className="text-[10px] text-muted-foreground">Day Streak</p>
                </Card>
                <Card className="p-3 text-center rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-muted w-fit mx-auto mb-1.5"><Target className="h-4 w-4 text-foreground" /></div>
                  <p className="text-lg font-display font-bold">{dailyEarned}/{dailyLimit}</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </Card>
              </div>
              <div className="mt-2.5 px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Daily Progress</span>
                  <span className="text-[10px] font-medium text-primary">{Math.round(dailyProgress)}%</span>
                </div>
                <Progress value={dailyProgress} className="h-1.5" />
              </div>
            </AnimatedSection>
          )}

          <Tabs defaultValue="games" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 h-11 bg-card/80 border border-border/50 rounded-2xl p-1">
              <TabsTrigger value="games" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Gamepad2 className="h-3 w-3" /> Games
              </TabsTrigger>
              <TabsTrigger value="rewards" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <ShoppingBag className="h-3 w-3" /> Rewards
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Trophy className="h-3 w-3" /> Top 10
              </TabsTrigger>
              <TabsTrigger value="spin" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Gift className="h-3 w-3" /> Spin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="games">
              {/* Tag filters */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => setFilter(tag)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors
                      ${filter === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {tag}
                  </button>
                ))}
              </div>

              {user && streak >= 7 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <div>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">7-Day Streak Bonus Active!</p>
                      <p className="text-[11px] text-muted-foreground">+50% bonus on all games</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredGames.map((game, i) => (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}>
                    <Card onClick={() => setActiveGame(game.id)}
                      className="overflow-hidden cursor-pointer group hover:shadow-lg active:scale-[0.97] transition-all duration-300 rounded-2xl border-border/50 bg-card/80">
                      <div className={`h-20 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{game.emoji}</span>
                        <Badge className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0 bg-black/30 text-white border-0">{game.tag}</Badge>
                      </div>
                      <div className="p-2.5 text-center space-y-0.5">
                        <h3 className="text-[11px] font-bold leading-tight truncate">{game.name}</h3>
                        <p className="text-[9px] text-muted-foreground">{game.desc}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rewards">
              <AnimatedSection>
                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h3 className="text-sm font-bold">Reward Center</h3>
                      <p className="text-[11px] text-muted-foreground">Exchange game points for real rewards!</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-lg font-display font-bold text-primary">{gamePoints.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Available</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {REWARDS.map(r => (
                    <Card key={r.id} className="p-4 rounded-2xl border-border/50 bg-card/80">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{r.emoji}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{r.name}</h4>
                          <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{r.cost.toLocaleString()}</p>
                          <Button size="sm" className="h-7 text-[10px] rounded-lg mt-1 px-3"
                            disabled={gamePoints < r.cost || redeeming === r.id}
                            onClick={() => handleRedeem(r)}>
                            {redeeming === r.id ? "..." : gamePoints >= r.cost ? "Redeem" : "Need more"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </AnimatedSection>
            </TabsContent>

            <TabsContent value="leaderboard">
              <AnimatedSection>
                <div className="space-y-2.5">
                  {leaderboard.length === 0 ? (
                    <Card className="p-12 text-center border-dashed rounded-2xl border-border/50">
                      <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No players yet</p>
                    </Card>
                  ) : (
                    leaderboard.map((player, i) => (
                      <motion.div key={player.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className={`p-3.5 flex items-center gap-3 rounded-2xl border-border/50 ${i < 3 ? "bg-gradient-to-r from-card to-card" : "bg-card/80"}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                            ${i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm" :
                              i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                              i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                              "bg-muted text-muted-foreground"}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{player.name}</p>
                            <p className="text-[10px] text-muted-foreground">Player</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-bold text-primary">{player.game_points?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground">points</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </AnimatedSection>
            </TabsContent>

            <TabsContent value="spin">
              <AnimatedSection>
                <Card className="p-6 rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center py-2">
                    <div className="p-3 rounded-2xl bg-accent/10 mb-3"><Gift className="h-6 w-6 text-accent" /></div>
                    <h2 className="text-lg font-display font-bold mb-1">Daily Lucky Spin</h2>
                    <p className="text-sm text-muted-foreground mb-6">1 free spin per day — win bonus points!</p>
                    <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />}>
                      <LuckySpin onWin={handleSpin} disabled={hasSpunToday} />
                    </Suspense>
                  </div>
                </Card>
              </AnimatedSection>
            </TabsContent>
          </Tabs>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default GamesPortal;
