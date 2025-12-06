import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award, Coins, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import { getRelativeTimeString } from "@/lib/timeUtils";
import BottomNav from "@/components/BottomNav";

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
}

const TopEarners = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const { user } = useAuth();
  const { isUserOnline, getUserLastActive } = useOnlineUsers();
  const navigate = useNavigate();

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, points")
      .order("points", { ascending: false })
      .limit(50);

    if (data) {
      setLeaderboard(data);
    }
  };

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
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-xl animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-6 w-6 text-primary" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              leaderboard.map((leaderUser, index) => {
                const isCurrentUser = user?.id === leaderUser.id;
                const isOnline = isUserOnline(leaderUser.id);
                const lastActive = getUserLastActive(leaderUser.id);
                const rank = index + 1;
                
                return (
                  <div 
                    key={leaderUser.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 animate-fade-in ${
                      isCurrentUser 
                        ? "bg-primary/20 border-2 border-primary shadow-lg" 
                        : "bg-background/50 border border-border hover:bg-background/80"
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-display font-semibold truncate ${isCurrentUser ? "text-primary" : ""}`}>
                          {leaderUser.name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                        {isOnline ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
                          </div>
                        ) : lastActive ? (
                          <span className="text-xs text-muted-foreground">{getRelativeTimeString(lastActive)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-display font-bold text-primary">{leaderUser.points.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default TopEarners;