import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Check, X, Clock, Loader2, Search, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";
import { format } from "date-fns";

interface PurchaseRequest {
  id: string;
  user_id: string;
  plan_id: string;
  phone_number: string;
  status: string;
  points_per_minute: number;
  created_at: string;
  plan?: {
    name: string;
    price_mmk: number;
    duration_months: number;
    plan_type: string;
  };
  profile?: {
    name: string;
    email: string;
  };
}

const PremiumRequestsManage = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("premium_purchase_requests")
      .select(`
        *,
        plan:premium_plans(name, price_mmk, duration_months, plan_type)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
    } else if (data) {
      // Fetch user profiles separately
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedData = data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id)
      }));

      setRequests(enrichedData);
    }

    setLoading(false);
  };

  const handleApprove = async (request: PurchaseRequest) => {
    setProcessing(true);
    
    try {
      // Update request status
      await supabase
        .from("premium_purchase_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", request.id);

      // Create or update premium membership
      const expiresAt = new Date();
      const durationMonths = request.plan?.duration_months || 1;
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      const { data: existingMembership } = await supabase
        .from("premium_memberships")
        .select("id, expires_at")
        .eq("user_id", request.user_id)
        .maybeSingle();

      if (existingMembership) {
        const currentExpiry = new Date(existingMembership.expires_at);
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

        await supabase
          .from("premium_memberships")
          .update({
            expires_at: newExpiry.toISOString(),
            is_active: true,
            points_per_minute: request.points_per_minute,
          })
          .eq("user_id", request.user_id);
      } else {
        await supabase
          .from("premium_memberships")
          .insert({
            user_id: request.user_id,
            is_active: true,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            points_per_minute: request.points_per_minute,
          });
      }

      toast({ title: "Success", description: "Premium membership approved!" });
      loadRequests();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    
    try {
      await supabase
        .from("premium_purchase_requests")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason || "Request rejected by admin",
        })
        .eq("id", selectedRequest.id);

      toast({ title: "Request Rejected", description: "The user has been notified" });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      loadRequests();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone_number?.includes(search) ||
    r.plan?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium Requests
              </h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount} pending approval
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or plan..."
              className="pl-10"
            />
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No premium requests found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{request.profile?.name || "Unknown User"}</p>
                        <p className="text-sm text-muted-foreground">{request.phone_number}</p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Plan</p>
                        <p className="font-medium">{request.plan?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium">{(request.plan?.price_mmk || 0).toLocaleString()} Ks</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Points/min</p>
                        <p className="font-medium text-green-600">{request.points_per_minute}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">{format(new Date(request.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleApprove(request)}
                          disabled={processing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectDialogOpen(true);
                          }}
                          disabled={processing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this premium request?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default PremiumRequestsManage;