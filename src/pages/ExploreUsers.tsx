import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, User, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import VerificationBadge from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  points: number;
  created_at: string | null;
}

const ExploreUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, points, created_at")
      .order("name", { ascending: true });

    if (!error && data) {
      // Filter out current user
      const filteredUsers = data.filter((u) => u.id !== user?.id);
      setUsers(filteredUsers);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startChat = async (otherUserId: string) => {
    if (!user) return;

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingConv) {
      navigate(`/chat/${existingConv.id}`);
      return;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant1_id: user.id,
        participant2_id: otherUserId,
      })
      .select("id")
      .single();

    if (newConv) {
      navigate(`/chat/${newConv.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />

        <div className="relative z-10 p-4 pt-6 pb-5">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate(-1)} className="text-primary-foreground">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-display font-bold text-primary-foreground">
              Explore Users
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/50" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-11 pr-4 py-3 h-12 rounded-2xl",
                "bg-primary-foreground/10 border-primary-foreground/20",
                "text-primary-foreground placeholder:text-primary-foreground/50",
                "focus:bg-primary-foreground/15"
              )}
            />
          </div>
        </div>
      </header>

      {/* Users List */}
      <div className="max-w-screen-xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          filteredUsers.map((profile, index) => (
            <Card
              key={profile.id}
              className={cn(
                "premium-card cursor-pointer animate-slide-up",
                "hover:border-primary/30"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => navigate(`/profile/${profile.id}`)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{profile.name}</h3>
                      <VerificationBadge points={profile.points} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile.points.toLocaleString()} points
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startChat(profile.id);
                  }}
                  className={cn(
                    "p-3 rounded-xl bg-primary/10 text-primary",
                    "hover:bg-primary/20 transition-colors",
                    "active:scale-95"
                  )}
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ExploreUsers;
