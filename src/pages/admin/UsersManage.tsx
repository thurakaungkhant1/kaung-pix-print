import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Search, MoreVertical, Ban, CheckCircle, Edit, Trash2, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  email: string | null;
  created_at: string;
  points: number;
  account_status: string;
  avatar_url: string | null;
}

const UsersManage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone_number: "", email: "" });
  const [banReason, setBanReason] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: editForm.name,
        phone_number: editForm.phone_number,
        email: editForm.email,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User updated successfully" });
      loadUsers();
    }
    setEditDialogOpen(false);
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    const newStatus = selectedUser.account_status === "banned" ? "good" : "banned";
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: newStatus })
      .eq("id", selectedUser.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update account status", variant: "destructive" });
    } else {
      toast({
        title: "Success",
        description: newStatus === "banned" ? "User has been banned" : "User has been unbanned",
      });
      loadUsers();
    }
    setBanDialogOpen(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Note: Actual user deletion in auth.users requires admin API
    // This just removes the profile
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", selectedUser.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete user profile", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User profile deleted" });
      loadUsers();
    }
    setDeleteDialogOpen(false);
  };

  const openEditDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setEditForm({
      name: userProfile.name,
      phone_number: userProfile.phone_number,
      email: userProfile.email || "",
    });
    setEditDialogOpen(true);
  };

  const openBanDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const openViewDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.phone_number.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  });

  const totalBanned = users.filter((u) => u.account_status === "banned").length;

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Users</h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-primary-foreground hover:bg-primary-foreground/10"
            onClick={loadUsers}
          >
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-destructive">{totalBanned}</p>
              <p className="text-sm text-muted-foreground">Banned Users</p>
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

        {/* Users List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            filteredUsers.map((userProfile) => (
              <Card key={userProfile.id} className={cn(userProfile.account_status === "banned" && "border-destructive/50")}>
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                      {userProfile.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{userProfile.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {userProfile.email || userProfile.phone_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined: {format(new Date(userProfile.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={userProfile.account_status === "banned" ? "destructive" : "outline"}
                        className={cn(
                          userProfile.account_status === "banned"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-green-500/10 text-green-600 border-green-500/20"
                        )}
                      >
                        {userProfile.account_status === "banned" ? "Banned" : "Active"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(userProfile)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(userProfile)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openBanDialog(userProfile)}>
                            {userProfile.account_status === "banned" ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unban User
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(userProfile)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                  <Badge variant={selectedUser.account_status === "banned" ? "destructive" : "outline"}>
                    {selectedUser.account_status === "banned" ? "Banned" : "Active"}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{selectedUser.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedUser.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-bold">{selectedUser.points.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{format(new Date(selectedUser.created_at), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{selectedUser.id}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={editForm.phone_number}
                onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {selectedUser?.account_status === "banned" ? "Unban User" : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.account_status === "banned"
                ? `Are you sure you want to unban ${selectedUser?.name}?`
                : `Are you sure you want to ban ${selectedUser?.name}? They will not be able to access the app.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button
              variant={selectedUser?.account_status === "banned" ? "default" : "destructive"}
              onClick={handleBanUser}
            >
              {selectedUser?.account_status === "banned" ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}'s profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default UsersManage;
