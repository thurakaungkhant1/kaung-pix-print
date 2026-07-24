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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Gamepad2, Trophy, Target, Flame, Gift, ArrowLeft, Star, Sparkles,
  ShoppingBag, WifiOff, History, ChevronRight, Play, TrendingUp,
  Minus, Plus, Check as CheckIcon, Coins,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import AIGameHint from "@/components/AIGameHint";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import defaultAvatar from "@/assets/default-avatar.svg";
import { showInterstitialAd } from "@/lib/nativeAds";

const LAST_GAME_KEY = "games:lastOpenedId";
// Show interstitial when user switches from one game to another
const openGameWithAd = (
  newId: string,
  setter: (id: string | null) => void,
) => {
  try {
    const last = localStorage.getItem(LAST_GAME_KEY);
    if (last && last !== newId) showInterstitialAd();
    localStorage.setItem(LAST_GAME_KEY, newId);
  } catch { /* ignore */ }
  setter(newId);
};

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
  { id: "tic-tac-toe", name: "Tic Tac Toe", emoji: "🎯", gradient: "from-blue-500 to-cyan-500", desc: "Classic strategy duel", tag: "Popular", points: 15, plays: "1.5k" },
  { id: "snake", name: "Snake", emoji: "🐍", gradient: "from-green-500 to-emerald-500", desc: "Eat & grow longer", tag: "Classic", points: 15, plays: "1.2k" },
  { id: "memory", name: "Memory Match", emoji: "🧠", gradient: "from-purple-500 to-violet-500", desc: "Find matching pairs", tag: "Brain", points: 15, plays: "980" },
  { id: "2048", name: "2048", emoji: "🧮", gradient: "from-amber-500 to-orange-500", desc: "Merge tiles puzzle", tag: "Puzzle", points: 20, plays: "1.1k" },
  { id: "click-speed", name: "Click Speed", emoji: "👆", gradient: "from-red-500 to-rose-500", desc: "10sec tap challenge", tag: "Speed", points: 10, plays: "850" },
  { id: "whack-a-mole", name: "Whack-a-Mole", emoji: "🐹", gradient: "from-orange-500 to-amber-500", desc: "Hit moles fast", tag: "Action", points: 15, plays: "920" },
  { id: "reaction", name: "Reaction Time", emoji: "⚡", gradient: "from-cyan-500 to-teal-500", desc: "Test your reflexes", tag: "Speed", points: 10, plays: "760" },
  { id: "quiz", name: "Myanmar Quiz", emoji: "❓", gradient: "from-indigo-500 to-blue-500", desc: "Test your knowledge", tag: "Quiz", points: 20, plays: "640" },
  { id: "flappy", name: "Flappy Bird", emoji: "🐦", gradient: "from-teal-500 to-green-500", desc: "Fly & dodge pipes", tag: "Arcade", points: 20, plays: "1.4k" },
  { id: "car-dodge", name: "Car Dodge", emoji: "🏎️", gradient: "from-rose-500 to-pink-500", desc: "High-speed dodging action", tag: "Arcade", points: 20, plays: "1.2k" },
  { id: "color-match", name: "Color Match", emoji: "🎨", gradient: "from-pink-500 to-fuchsia-500", desc: "Match the colors", tag: "Brain", points: 15, plays: "560" },
  { id: "word-scramble", name: "Word Scramble", emoji: "🔤", gradient: "from-violet-500 to-purple-500", desc: "Unscramble words", tag: "Word", points: 15, plays: "490" },
  { id: "math", name: "Math Challenge", emoji: "➕", gradient: "from-emerald-500 to-teal-500", desc: "Quick math problems", tag: "Brain", points: 15, plays: "720" },
  { id: "simon", name: "Simon Says", emoji: "🔴", gradient: "from-red-500 to-orange-500", desc: "Follow the pattern", tag: "Memory", points: 15, plays: "510" },
  { id: "bubble-pop", name: "Bubble Pop Glos", emoji: "🫧", gradient: "from-sky-500 to-blue-500", desc: "Relaxing bubble shooter with stunning visuals", tag: "Action", points: 15, plays: "850" },
  { id: "typing", name: "Typing Race", emoji: "⌨️", gradient: "from-slate-500 to-gray-500", desc: "Type as fast as you can", tag: "Speed", points: 15, plays: "430" },
  { id: "number-guess", name: "Number Guess", emoji: "🔢", gradient: "from-lime-500 to-green-500", desc: "Guess the number", tag: "Logic", points: 10, plays: "380" },
  { id: "rps", name: "Rock Paper Scissors", emoji: "✂️", gradient: "from-stone-500 to-zinc-500", desc: "Beat the CPU", tag: "Classic", points: 10, plays: "620" },
  { id: "pattern", name: "Pattern Recall", emoji: "🧩", gradient: "from-fuchsia-500 to-pink-500", desc: "Remember the tiles", tag: "Memory", points: 15, plays: "440" },
  { id: "coin-flip", name: "Coin Flip", emoji: "🪙", gradient: "from-yellow-500 to-amber-500", desc: "Heads or tails", tag: "Luck", points: 10, plays: "590" },
  { id: "emoji-match", name: "Emoji Match", emoji: "😀", gradient: "from-orange-400 to-red-500", desc: "Find emoji pairs", tag: "Speed", points: 15, plays: "520" },
  { id: "target-shoot", name: "Target Shoot", emoji: "🎯", gradient: "from-red-600 to-rose-500", desc: "Hit moving targets", tag: "Action", points: 15, plays: "470" },
  { id: "flag-quiz", name: "Flag Quiz", emoji: "🏳️", gradient: "from-blue-600 to-indigo-500", desc: "Guess the country", tag: "Quiz", points: 20, plays: "390" },
  { id: "piano-tiles", name: "Piano Tiles", emoji: "🎹", gradient: "from-gray-600 to-zinc-500", desc: "Tap the black tiles", tag: "Rhythm", points: 15, plays: "510" },
  { id: "fruit-catch", name: "Fruit Catch", emoji: "🧺", gradient: "from-green-600 to-lime-500", desc: "Catch falling fruits", tag: "Arcade", points: 15, plays: "470" },
  { id: "hilo", name: "Hi-Lo Cards", emoji: "🃏", gradient: "from-emerald-600 to-green-500", desc: "Higher or lower", tag: "Luck", points: 10, plays: "350" },
  { id: "maze", name: "Maze Runner", emoji: "🏃", gradient: "from-amber-600 to-yellow-500", desc: "Find the exit", tag: "Puzzle", points: 20, plays: "410" },
  { id: "jump", name: "Jump Runner", emoji: "🦘", gradient: "from-sky-600 to-cyan-500", desc: "Jump & run", tag: "Arcade", points: 15, plays: "480" },
  { id: "spot-diff", name: "Spot Difference", emoji: "🔍", gradient: "from-violet-600 to-indigo-500", desc: "Find the odd one out", tag: "Brain", points: 15, plays: "330" },
  { id: "tower", name: "Tower Stack", emoji: "🏗️", gradient: "from-orange-600 to-red-500", desc: "Stack the blocks", tag: "Arcade", points: 15, plays: "460" },
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
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { gamePoints, dailyEarned, dailyLimit, streak, canPlay, getCooldownRemaining, submitScore, refreshData } = useGamePoints();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [filter, setFilter] = useState("All");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("games");
  const [gameSettings, setGameSettings] = useState<Record<string, { is_active: boolean; points_override: number | null }>>({});
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [redeemQty, setRedeemQty] = useState(1);
  const [successReward, setSuccessReward] = useState<{ name: string; qty: number; cost: number } | null>(null);

  // Apply admin settings: hide disabled games, override points
  const visibleGames = GAMES
    .filter(g => gameSettings[g.id]?.is_active !== false)
    .map(g => {
      const override = gameSettings[g.id]?.points_override;
      return override != null ? { ...g, points: override } : g;
    });

  const TAGS = ["All", ...Array.from(new Set(visibleGames.map(g => g.tag)))];
  const initials = (profileName || user?.email || "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name").eq("id", user.id).single()
      .then(({ data }) => { if (data?.name) setProfileName(data.name); });
  }, [user]);

  useEffect(() => {
    if (!isOnline) return;

    const loadLb = async () => {
      const { data: adminRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "mobile_admin"] as any);
      const adminIds = new Set((adminRows ?? []).map((r: any) => r.user_id));
      const { data } = await supabase
        .from("public_profiles")
        .select("id, name, avatar_url, game_points")
        .order("game_points", { ascending: false })
        .limit(30);
      if (data) setLeaderboard((data as any[]).filter((d) => !adminIds.has(d.id)).slice(0, 10));
    };
    loadLb();
    supabase.from("game_reward_items").select("*").eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setRewards(data as RewardItem[]); });

    const channel = supabase
      .channel("games-lb-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadLb())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    supabase.from("mini_game_settings").select("game_id,is_active,points_override")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { is_active: boolean; points_override: number | null }> = {};
          data.forEach((r: any) => { map[r.game_id] = { is_active: r.is_active, points_override: r.points_override }; });
          setGameSettings(map);
        }
      });
  }, [isOnline]);

  // Check daily spin status on load
  useEffect(() => {
    if (!user || !isOnline) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("spinner_spins")
      .select("id")
      .eq("user_id", user.id)
      .eq("spin_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasSpunToday(true);
      });
  }, [user, isOnline]);

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
    if (!user || !isOnline) {
      setHasSpunToday(true);
      return;
    }
    const today = new Date().toISOString().split("T")[0];

    // Persist the daily spin record — DB uniqueness prevents 2nd spin/day
    const { error: spinErr } = await supabase
      .from("spinner_spins")
      .insert({ user_id: user.id, spin_date: today, points_won: points });

    if (spinErr) {
      // Already spun today (unique constraint) or other error → lock UI
      setHasSpunToday(true);
      toast({
        title: "Already spun today",
        description: "Come back tomorrow for another spin!",
        variant: "destructive",
      });
      return;
    }

    if (points > 0) {
      await supabase.from("profiles").update({ game_points: gamePoints + points }).eq("id", user.id);
      await supabase.from("game_scores").insert({
        user_id: user.id, game_name: "lucky-spin", score: points, points_earned: points, is_win: points > 0,
      });
    }
    setHasSpunToday(true);
  };

  const handleRedeem = async (reward: RewardItem, qty: number = 1) => {
    if (!user || redeeming) return;
    const totalCost = reward.cost_points * qty;
    if (gamePoints < totalCost) {
      toast({ title: "Not enough points!", description: `You need ${totalCost.toLocaleString()} game points.`, variant: "destructive" });
      return;
    }
    setRedeeming(reward.id);
    try {
      const newPoints = gamePoints - totalCost;
      await supabase.from("profiles").update({ game_points: newPoints }).eq("id", user.id);
      if (reward.reward_type === "shop_coins") {
        const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single();
        if (profile) {
          const totalShopCoins = Number(reward.reward_value) * qty;
          await supabase.from("profiles").update({ points: profile.points + totalShopCoins }).eq("id", user.id);
          await supabase.from("point_transactions").insert({
            user_id: user.id, amount: totalShopCoins, transaction_type: "game_reward",
            description: `Converted ${totalCost} game points to ${totalShopCoins} shop coins`,
          });
        }
      } else if (reward.reward_type === "wallet_credit") {
        const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
        if (profile) {
          await supabase.from("profiles").update({ wallet_balance: Number(profile.wallet_balance || 0) + Number(reward.reward_value) * qty }).eq("id", user.id);
        }
      }
      const rows = Array.from({ length: qty }).map(() => ({
        user_id: user.id, reward_item_id: reward.id, reward_name: reward.name,
        cost_points: reward.cost_points, reward_type: reward.reward_type, reward_value: reward.reward_value,
        status: reward.reward_type === "manual" || reward.reward_type === "premium_days" ? "pending" : "delivered",
      }));
      await supabase.from("game_redemptions").insert(rows);
      setSelectedReward(null);
      setSuccessReward({ name: reward.name, qty, cost: totalCost });
      refreshData();
    } catch {
      toast({ title: "Redemption failed", variant: "destructive" });
    }
    setRedeeming(null);
  };

  const filteredGames = filter === "All" ? visibleGames : visibleGames.filter(g => g.tag === filter);
  const dailyProgress = dailyLimit > 0 ? Math.min((dailyEarned / dailyLimit) * 100, 100) : 0;

  // Active game view
  if (activeGame) {
    const game = GAMES.find(g => g.id === activeGame);
    const GameComponent = GameComponents[activeGame];
    return (
      <AnimatedPage>
        <MobileLayout>
          <div className="max-w-screen-xl mx-auto px-0 sm:px-4 pt-2 sm:pt-4 pb-24">
            <div className="flex items-center gap-3 mb-3 px-3 sm:px-0">
              <Button variant="ghost" size="icon" onClick={() => setActiveGame(null)} className="rounded-xl h-11 w-11 bg-card border border-border/50">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-display font-bold truncate">{game?.emoji} {game?.name}</h1>
                <p className="text-[11px] text-muted-foreground truncate">{game?.desc}</p>
              </div>
              {!canPlay(activeGame) && (
                <Badge variant="secondary" className="text-xs shrink-0">⏱ {getCooldownRemaining(activeGame)}s</Badge>
              )}
              <AIGameHint gameName={game?.name || activeGame} gameDesc={game?.desc} />
            </div>
            <Card className="rounded-none sm:rounded-2xl border-x-0 sm:border-x border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="p-2 sm:p-6 w-full">
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading game...</p>
                  </div>
                }>
                  <GameComponent onGameEnd={(score, isWin) => handleGameEnd(activeGame, score, isWin)} />
                </Suspense>
              </div>
            </Card>
          </div>
        </MobileLayout>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <MobileLayout className="bg-background">
        {/* Top Bar */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/15 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                MiniGamePortal
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-2xl font-display font-black text-foreground tracking-tight">Game Portal</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Play & Earn Rewards</p>
            </div>
            <button
              onClick={() => navigate("/account")}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md"
            >
              {initials}
            </button>
          </div>
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-500/20">
              <WifiOff className="h-3.5 w-3.5" />Offline Mode — Scores sync when online
            </div>
          )}
        </header>

        {/* Available Game Points Hero Card */}
        <AnimatedSection>
          <section className="px-5">
            <div
              className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
              style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #fbbf24 100%)" }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-white/80">Available Game Points</p>
                </div>
                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-4xl font-display font-black tabular-nums tracking-tight">
                    {gamePoints.toLocaleString()}
                  </span>
                  <Star className="h-5 w-5 text-yellow-200 fill-yellow-200" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-white/80" />
                      <span className="text-[11px] text-white/85">
                        Daily Progress: {dailyEarned} / {dailyLimit}
                      </span>
                    </div>
                    {streak >= 1 && (
                      <span className="text-[11px] text-white/85 flex items-center gap-1">
                        <Flame className="h-3 w-3" /> {streak}d
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${dailyProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Daily Lucky Spin removed */}

        <div className="px-5 mt-5 pb-28">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 h-11 bg-card border border-border/60 rounded-2xl p-1">
              <TabsTrigger value="games" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Gamepad2 className="h-3 w-3" /> Games
              </TabsTrigger>
              <TabsTrigger value="rewards" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <ShoppingBag className="h-3 w-3" /> Rewards
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 text-[11px] rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Trophy className="h-3 w-3" /> Top 10
              </TabsTrigger>
            </TabsList>

            <TabsContent value="games">
              {/* Featured Games header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display font-bold">Featured Games</h2>
                <button onClick={() => setFilter("All")} className="text-xs text-primary font-semibold">
                  See All
                </button>
              </div>

              {/* Tag filters */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => setFilter(tag)}
                    className={cn("shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                      filter === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    {tag}
                  </button>
                ))}
              </div>

              {/* List view */}
              <div className="space-y-3 mt-2">
                {filteredGames.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <Card
                      onClick={() => openGameWithAd(game.id, setActiveGame)}
                      className="overflow-hidden cursor-pointer rounded-2xl border-border/60 bg-card hover:shadow-md active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Thumbnail */}
                        <div className={cn("w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 relative overflow-hidden", game.gradient)}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
                          <span className="text-4xl relative z-10">{game.emoji}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="text-sm font-bold truncate">{game.name}</h3>
                            {game.tag === "Popular" && (
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] px-1.5 py-0 hover:bg-blue-100">NEW</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">{game.desc}</p>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <Gamepad2 className="h-3 w-3" /> +{game.points} pts
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Trophy className="h-3 w-3" /> {game.plays} pla
                            </span>
                          </div>
                        </div>
                        {/* Play button */}
                        <Button
                          size="sm"
                          className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 h-9 flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); setActiveGame(game.id); }}
                        >
                          Play
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Bottom action buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/point-history")}
                  className="rounded-full h-12 font-semibold border-border/60 text-foreground"
                >
                  <History className="h-4 w-4 mr-2" /> Point History
                </Button>
                <Button
                  onClick={() => setActiveTab("rewards")}
                  className="rounded-full h-12 font-semibold bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Gift className="h-4 w-4 mr-2" /> Redeem Items
                </Button>
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
                  {rewards.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No rewards available yet</p>
                  )}
                  {rewards.map(r => (
                    <Card
                      key={r.id}
                      onClick={() => { setSelectedReward(r); setRedeemQty(1); }}
                      className="p-4 rounded-2xl border-border/60 bg-card hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{r.emoji}</div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{r.name}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{r.cost_points.toLocaleString()}</p>
                          <Button
                            size="sm"
                            className="h-7 text-[10px] rounded-full mt-1 px-3"
                            disabled={gamePoints < r.cost_points || redeeming === r.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedReward(r); setRedeemQty(1); }}
                          >
                            {redeeming === r.id ? "..." : gamePoints >= r.cost_points ? "Redeem" : "Need more"}
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
                    <Card className="p-12 text-center border-dashed rounded-2xl border-border/60">
                      <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No players yet</p>
                    </Card>
                  ) : (
                    leaderboard.map((player, i) => (
                      <motion.div
                        key={player.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26, delay: i * 0.04 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Card className="p-3.5 flex items-center gap-3 rounded-2xl border-border/60 bg-card">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                            i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white" :
                              i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                                i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                                  "bg-muted text-muted-foreground")}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </div>
                          <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                            <AvatarImage src={player.avatar_url || defaultAvatar} className="object-cover" />
                            <AvatarFallback className="text-xs">{player.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{player.name}</p>
                            <p className="text-[10px] text-muted-foreground">Player</p>
                          </div>
                          <motion.div
                            key={player.game_points}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="text-right shrink-0"
                          >
                            <p className="font-display font-bold text-primary">{player.game_points?.toLocaleString() || 0}</p>
                            <p className="text-[10px] text-muted-foreground">points</p>
                          </motion.div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </AnimatedSection>
            </TabsContent>

          </Tabs>
        </div>

        {/* Reward detail + redeem confirmation */}
        <Dialog open={!!selectedReward} onOpenChange={(o) => { if (!o) setSelectedReward(null); }}>
          <DialogContent className="rounded-2xl max-w-sm">
            {selectedReward && (() => {
              const maxAffordable = Math.max(1, Math.floor(gamePoints / selectedReward.cost_points));
              const totalCost = selectedReward.cost_points * redeemQty;
              const canAfford = gamePoints >= totalCost;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-center">Redeem Item</DialogTitle>
                    <DialogDescription className="text-center">Review the details before confirming.</DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col items-center py-2">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-5xl mb-3">
                      {selectedReward.emoji}
                    </div>
                    <h3 className="text-lg font-bold">{selectedReward.name}</h3>
                    {selectedReward.description && (
                      <p className="text-xs text-muted-foreground text-center mt-1 px-2">{selectedReward.description}</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-muted/50 p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cost per item</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        {selectedReward.cost_points.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 rounded-full"
                          onClick={() => setRedeemQty((q) => Math.max(1, q - 1))}
                          disabled={redeemQty <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="font-bold w-6 text-center tabular-nums">{redeemQty}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 rounded-full"
                          onClick={() => setRedeemQty((q) => Math.min(maxAffordable, q + 1))}
                          disabled={redeemQty >= maxAffordable}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                      <span className="font-semibold">Total Cost</span>
                      <span className={cn(
                        "font-bold text-base flex items-center gap-1",
                        canAfford ? "text-primary" : "text-destructive"
                      )}>
                        <Coins className="h-4 w-4" />
                        {totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Your balance</span>
                      <span>{gamePoints.toLocaleString()} coins</span>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={() => setSelectedReward(null)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleRedeem(selectedReward, redeemQty)}
                      disabled={!canAfford || redeeming === selectedReward.id}
                      className="rounded-xl"
                    >
                      {redeeming === selectedReward.id ? "Redeeming..." : `Confirm Redeem`}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Success confirmation */}
        <Dialog open={!!successReward} onOpenChange={(o) => { if (!o) setSuccessReward(null); }}>
          <DialogContent className="rounded-2xl max-w-sm">
            {successReward && (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                  <CheckIcon className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold mb-1">Redemption Successful! 🎉</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You redeemed <span className="font-semibold text-foreground">{successReward.qty}× {successReward.name}</span> for{" "}
                  <span className="font-semibold text-primary">{successReward.cost.toLocaleString()} coins</span>.
                </p>
                <Button onClick={() => setSuccessReward(null)} className="w-full rounded-xl">
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default GamesPortal;
