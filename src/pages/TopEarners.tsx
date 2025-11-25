import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import BottomNav from "@/components/BottomNav";

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
}

const TopEarners = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const { user } = useAuth();
  const { isUserOnline } = useOnlineUsers();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Top Earners</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              leaderboard.map((leaderUser, index) => {
                const isCurrentUser = user?.id === leaderUser.id;
                const isOnline = isUserOnline(leaderUser.id);
                const rank = index + 1;
                
                return (
                  <div 
                    key={leaderUser.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCurrentUser 
                        ? "bg-primary/20 border-2 border-primary" 
                        : "bg-background/50 border border-border"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 text-center">
                      {rank === 1 && <Trophy className="h-6 w-6 text-yellow-500 mx-auto" />}
                      {rank === 2 && <Medal className="h-6 w-6 text-gray-400 mx-auto" />}
                      {rank === 3 && <Award className="h-6 w-6 text-orange-600 mx-auto" />}
                      {rank > 3 && (
                        <span className="text-lg font-bold text-muted-foreground">
                          {rank}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${
                          isCurrentUser ? "text-primary" : ""
                        }`}>
                          {leaderUser.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        {isOnline && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Active Now
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {leaderUser.points.toLocaleString()}
                      </span>
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
