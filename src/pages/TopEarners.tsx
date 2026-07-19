import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award, Coins, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VerificationBadge from "@/components/VerificationBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import defaultAvatar from "@/assets/default-avatar.svg";

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  avatar_url: string | null;
}

const TopEarners = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const adminIdsRef = useRef<Set<string>>(new Set());

  const loadLeaderboard = async () => {
    // Fetch admin user ids to exclude
    if (adminIdsRef.current.size === 0) {
      const { data: adminRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "mobile_admin"] as any);
      adminIdsRef.current = new Set((adminRows ?? []).map((r: any) => r.user_id));
    }

    const { data } = await supabase
      .from("public_profiles")
      .select("id, name, game_points, avatar_url")
      .order("game_points", { ascending: false })
      .limit(50);

    if (data && Array.isArray(data)) {
      const filtered = (data as any[])
        .filter((d) => !adminIdsRef.current.has(d.id))
        .slice(0, 10);
      setLeaderboard(
        filtered.map((d) => ({
          id: d.id,
          name: d.name,
          points: d.game_points ?? 0,
          avatar_url: d.avatar_url,
        }))
      );
    }
  };

  useEffect(() => {
    loadLeaderboard();

    // Realtime: refresh whenever any profile's game_points changes
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Earners
          </h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-6 w-6 text-primary" />
              Leaderboard
              <span className="ml-auto text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <AnimatePresence initial={false}>
                {leaderboard.map((leaderUser, index) => {
                  const isCurrentUser = user?.id === leaderUser.id;
                  const rank = index + 1;

                  return (
                    <motion.div
                      key={leaderUser.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.03 }}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                        isCurrentUser
                          ? "bg-primary/20 border-2 border-primary shadow-lg"
                          : "bg-background/50 border border-border hover:bg-background/80"
                      }`}
                      onClick={() => navigate(`/profile/${leaderUser.id}`)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                      <Avatar className="h-10 w-10 border-2 border-primary/20 flex-shrink-0">
                        <AvatarImage src={leaderUser.avatar_url || defaultAvatar} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {leaderUser.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-display font-semibold truncate ${isCurrentUser ? "text-primary" : ""}`}>
                            {leaderUser.name}
                          </p>
                          <VerificationBadge points={leaderUser.points} size="sm" />
                          {isCurrentUser && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.div
                        key={leaderUser.points}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full"
                      >
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-display font-bold text-primary">{leaderUser.points.toLocaleString()}</span>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TopEarners;
