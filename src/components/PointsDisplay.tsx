import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PointsDisplay = () => {
  const [points, setPoints] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPoints();
      
      // Set up realtime subscription for points updates
      const channel = supabase
        .channel("points-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new && "points" in payload.new) {
              setPoints(payload.new.points as number);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadPoints = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (data) {
      setPoints(data.points);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
      <Coins className="h-4 w-4 text-primary" />
      <span className="text-sm font-bold text-primary">
        {points.toLocaleString()}
      </span>
    </div>
  );
};

export default PointsDisplay;
