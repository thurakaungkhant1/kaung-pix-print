import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Crown, Users, Coins, Calendar, RefreshCw, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import GrantPremiumDialog from "@/components/GrantPremiumDialog";
import MobileLayout from "@/components/MobileLayout";

interface PremiumUser {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string;
  expires_at: string;
  total_chat_points_earned: number;
  created_at: string;
  profile?: {
    name: string;
    email: string | null;
    phone_number: string;
    points: number;
  };
}

const PremiumUsersManage = () => {
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadPremiumUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("premium_memberships")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch profiles for all users
        const userIds = data.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, phone_number, points")
          .in("id", userIds);

        const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        const usersWithProfiles = data.map((membership) => ({
          ...membership,
          profile: profilesMap.get(membership.user_id),
        }));

        setPremiumUsers(usersWithProfiles);
      }
    } catch (error) {
      console.error("Error loading premium users:", error);
      toast({
        title: "Error",
        description: "Failed to load premium users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPremiumUsers();
    }
  }, [isAdmin]);

  const togglePremiumStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("premium_memberships")
        .update({ is_active: !currentStatus })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Premium status ${!currentStatus ? "activated" : "deactivated"}`,
      });
      loadPremiumUsers();
    } catch (error) {
      console.error("Error updating premium status:", error);
      toast({
        title: "Error",
        description: "Failed to update premium status",
        variant: "destructive",
      });
    }
  };

  const extendMembership = async (userId: string, months: number) => {
    try {
      const { data: membership } = await supabase
        .from("premium_memberships")
        .select("expires_at")
        .eq("user_id", userId)
        .single();

      if (!membership) return;

      const currentExpiry = new Date(membership.expires_at);
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
      newExpiry.setMonth(newExpiry.getMonth() + months);

      const { error } = await supabase
        .from("premium_memberships")
        .update({ expires_at: newExpiry.toISOString(), is_active: true })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Extended membership by ${months} month(s)`,
      });
      loadPremiumUsers();
    } catch (error) {
      console.error("Error extending membership:", error);
      toast({
        title: "Error",
        description: "Failed to extend membership",
        variant: "destructive",
      });
    }
  };

  const revokeMembership = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("premium_memberships")
        .update({ is_active: false, expires_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Premium membership revoked",
      });
      loadPremiumUsers();
    } catch (error) {
      console.error("Error revoking membership:", error);
      toast({
        title: "Error",
        description: "Failed to revoke membership",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = premiumUsers.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.profile?.name?.toLowerCase().includes(query) ||
      u.profile?.email?.toLowerCase().includes(query) ||
      u.profile?.phone_number?.toLowerCase().includes(query)
    );
  });

  const totalActiveUsers = premiumUsers.filter(
    (u) => u.is_active && new Date(u.expires_at) > new Date()
  ).length;
  const totalPointsEarned = premiumUsers.reduce(
    (sum, u) => sum + Number(u.total_chat_points_earned),
    0
  );

  if (!isAdmin) return null;

  return (
    <MobileLayout className="pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Premium Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage premium memberships
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={loadPremiumUsers}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setGrantDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Grant Premium
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{premiumUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Total Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalActiveUsers}</p>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPointsEarned.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Points Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Months/Sub</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Premium Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Chat Points</TableHead>
                    <TableHead>Total Points</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No premium users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const isExpired = new Date(user.expires_at) < new Date();
                      const isActive = user.is_active && !isExpired;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.profile?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.profile?.email || user.profile?.phone_number}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              className={cn(
                                isActive
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : isExpired
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-gray-500/10 text-gray-500"
                              )}
                            >
                              {isActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn(isExpired && "text-red-500")}>
                              {format(new Date(user.expires_at), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-amber-500">
                              {Number(user.total_chat_points_earned).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {user.profile?.points?.toLocaleString() || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePremiumStatus(user.user_id, user.is_active)}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => extendMembership(user.user_id, 1)}
                              >
                                +1 Month
                              </Button>
                              {isActive && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => revokeMembership(user.user_id)}
                                >
                                  Revoke
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <GrantPremiumDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        onSuccess={loadPremiumUsers}
      />
    </MobileLayout>
  );
};

export default PremiumUsersManage;
