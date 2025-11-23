import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  created_at: string;
}

const UsersManage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadUsers();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      navigate("/");
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Users</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Total Users: {users.length}
        </div>

        {users.map((userProfile) => (
          <Card key={userProfile.id}>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{userProfile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {userProfile.phone_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined: {new Date(userProfile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">User</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UsersManage;
