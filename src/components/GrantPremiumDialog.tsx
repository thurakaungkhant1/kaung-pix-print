import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Crown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
}

interface GrantPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const GrantPremiumDialog = ({ open, onOpenChange, onSuccess }: GrantPremiumDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [duration, setDuration] = useState("3");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    const query = searchQuery.toLowerCase();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone_number")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(10);

    if (data) {
      setSearchResults(data);
    }
    setSearching(false);
  };

  const handleGrantPremium = async () => {
    if (!selectedUser) return;

    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(duration));

    // Check if user already has a membership
    const { data: existing } = await supabase
      .from("premium_memberships")
      .select("id, expires_at")
      .eq("user_id", selectedUser.id)
      .maybeSingle();

    if (existing) {
      // Extend existing membership
      const currentExpiry = new Date(existing.expires_at);
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
      newExpiry.setMonth(newExpiry.getMonth() + parseInt(duration));

      const { error } = await supabase
        .from("premium_memberships")
        .update({
          expires_at: newExpiry.toISOString(),
          is_active: true,
        })
        .eq("user_id", selectedUser.id);

      if (error) {
        toast({ title: "Error", description: "Failed to extend membership", variant: "destructive" });
      } else {
        toast({ title: "Success", description: `Extended ${selectedUser.name}'s premium by ${duration} month(s)` });
        // Log the transaction
        await supabase.from("point_transactions").insert({
          user_id: selectedUser.id,
          amount: 0,
          transaction_type: "premium_grant",
          description: `Admin granted ${duration} month(s) premium extension`,
        });
        onSuccess();
        handleClose();
      }
    } else {
      // Create new membership
      const { error } = await supabase
        .from("premium_memberships")
        .insert({
          user_id: selectedUser.id,
          is_active: true,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        toast({ title: "Error", description: "Failed to grant premium", variant: "destructive" });
      } else {
        toast({ title: "Success", description: `Granted ${duration} month(s) premium to ${selectedUser.name}` });
        // Log the transaction
        await supabase.from("point_transactions").insert({
          user_id: selectedUser.id,
          amount: 0,
          transaction_type: "premium_grant",
          description: `Admin granted ${duration} month(s) premium membership`,
        });
        onSuccess();
        handleClose();
      }
    }
    setLoading(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setDuration("3");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Grant Premium Membership
          </DialogTitle>
          <DialogDescription>
            Search for a user and grant them premium membership
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label>Search User</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, or phone..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? "..." : "Search"}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="border rounded-lg max-h-48 overflow-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email || user.phone_number}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="border rounded-lg p-3 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email || selectedUser.phone_number}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleGrantPremium} disabled={!selectedUser || loading}>
            {loading ? "Granting..." : "Grant Premium"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrantPremiumDialog;
