import { useState, useEffect } from "react";
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, Eye, Loader2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { toast } from "sonner";
import { format } from "date-fns";

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    name: string;
    phone_number: string;
  };
}

const DepositsManage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [showScreenshot, setShowScreenshot] = useState(false);

  useEffect(() => {
    loadDeposits();

    // Real-time subscription
    const channel = supabase
      .channel('deposits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_deposits'
        },
        () => loadDeposits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const loadDeposits = async () => {
    try {
      let query = supabase
        .from('wallet_deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: depositsData, error: depositsError } = await query;

      if (depositsError) throw depositsError;

      // Fetch profiles for each deposit
      const depositsWithProfiles = await Promise.all(
        (depositsData || []).map(async (deposit) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone_number')
            .eq('id', deposit.user_id)
            .single();
          
          return {
            ...deposit,
            profiles: profileData || { name: 'Unknown', phone_number: '' }
          };
        })
      );

      setDeposits(depositsWithProfiles);
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast.error("Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  const viewScreenshot = async (deposit: Deposit) => {
    try {
      const { data } = await supabase.storage
        .from('deposit-screenshots')
        .createSignedUrl(deposit.screenshot_url, 3600);
      
      if (data?.signedUrl) {
        setScreenshotUrl(data.signedUrl);
        setShowScreenshot(true);
      }
    } catch (error) {
      console.error('Error loading screenshot:', error);
      toast.error("Failed to load screenshot");
    }
  };

  const handleApprove = async () => {
    if (!selectedDeposit || !user) return;

    setProcessing(true);
    try {
      // Get current user balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', selectedDeposit.user_id)
        .single();

      if (profileError) throw profileError;

      const currentBalance = profile?.wallet_balance || 0;
      const newBalance = currentBalance + selectedDeposit.amount;

      // Update deposit status
      const { error: depositError } = await supabase
        .from('wallet_deposits')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDeposit.id);

      if (depositError) throw depositError;

      // Update user wallet balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedDeposit.user_id);

      if (balanceError) throw balanceError;

      // Create wallet transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: selectedDeposit.user_id,
          amount: selectedDeposit.amount,
          transaction_type: 'deposit',
          reference_id: selectedDeposit.id,
          description: 'Deposit approved',
          balance_after: newBalance
        });

      if (txError) throw txError;

      toast.success("Deposit approved successfully!");
      setSelectedDeposit(null);
      setAdminNotes("");
      loadDeposits();
    } catch (error: any) {
      console.error('Error approving deposit:', error);
      toast.error(error.message || "Failed to approve deposit");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit || !user) return;

    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('wallet_deposits')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDeposit.id);

      if (error) throw error;

      toast.success("Deposit rejected");
      setSelectedDeposit(null);
      setAdminNotes("");
      loadDeposits();
    } catch (error: any) {
      console.error('Error rejecting deposit:', error);
      toast.error(error.message || "Failed to reject deposit");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('my-MM').format(amount) + ' Ks';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredDeposits = deposits.filter(deposit => {
    const userName = deposit.profiles?.name?.toLowerCase() || '';
    const phone = deposit.profiles?.phone_number?.toLowerCase() || '';
    return userName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  });

  const pendingCount = deposits.filter(d => d.status === 'pending').length;

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="hero-gaming py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Deposit Requests</h1>
              {pendingCount > 0 && (
                <p className="text-sm text-primary">{pendingCount} pending</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-card/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Deposits List */}
        <div className="p-4 -mt-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deposits found
            </div>
          ) : (
            filteredDeposits.map((deposit) => (
              <div key={deposit.id} className="card-neon p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{deposit.profiles?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {deposit.profiles?.phone_number}
                    </p>
                  </div>
                  {getStatusBadge(deposit.status)}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-neon">
                      {formatCurrency(deposit.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(deposit.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewScreenshot(deposit)}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    {deposit.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedDeposit(deposit)}
                        className="btn-neon"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>

                {deposit.admin_notes && (
                  <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    Note: {deposit.admin_notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedDeposit} onOpenChange={(open) => !open && setSelectedDeposit(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Review Deposit Request</DialogTitle>
              <DialogDescription>
                Approve or reject this deposit request
              </DialogDescription>
            </DialogHeader>

            {selectedDeposit && (
              <div className="space-y-4">
                <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                  <p className="font-medium">{selectedDeposit.profiles?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDeposit.profiles?.phone_number}
                  </p>
                  <p className="text-2xl font-bold text-neon mt-2">
                    {formatCurrency(selectedDeposit.amount)}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => viewScreenshot(selectedDeposit)}
                >
                  <Image className="h-4 w-4 mr-2" />
                  View Payment Screenshot
                </Button>

                <div className="space-y-2">
                  <Label>Admin Notes (optional for approve, required for reject)</Label>
                  <Textarea
                    placeholder="Add notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
                className="flex-1"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 btn-neon"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Screenshot Dialog */}
        <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>Payment Screenshot</DialogTitle>
            </DialogHeader>
            {screenshotUrl && (
              <div className="max-h-[70vh] overflow-auto">
                <img 
                  src={screenshotUrl} 
                  alt="Payment screenshot" 
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default DepositsManage;
