import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, Search, CheckCircle, XCircle, Clock, Eye, Loader2, Image as ImageIcon,
  Volume2, VolumeX, Bell, BellOff, Settings2, History, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAdminNotificationPrefs } from "@/hooks/useAdminNotificationPrefs";

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  transaction_id?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  profiles?: { name: string; phone_number: string };
}

interface AuditEntry {
  id: string;
  deposit_id: string;
  actor_id: string | null;
  action: "approved" | "rejected";
  amount: number;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  actor_name?: string;
}

const DepositsManage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = useAdminNotificationPrefs();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [depositStats, setDepositStats] = useState({
    totalApproved: 0, totalPending: 0, totalRejected: 0, count: 0,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproveConfirmOpen, setBulkApproveConfirmOpen] = useState(false);
  const [bulkReasonOpen, setBulkReasonOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [auditByDeposit, setAuditByDeposit] = useState<Record<string, AuditEntry[]>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadDeposits();
    loadDepositStats();
    const channel = supabase
      .channel("deposits-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_deposits" },
        () => {
          loadDeposits();
          loadDepositStats();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadDepositStats = async () => {
    const [approved, pending, rejected] = await Promise.all([
      supabase.from("wallet_deposits").select("amount").eq("status", "approved"),
      supabase.from("wallet_deposits").select("amount").eq("status", "pending"),
      supabase.from("wallet_deposits").select("amount").eq("status", "rejected"),
    ]);
    setDepositStats({
      totalApproved: approved.data?.reduce((s, d) => s + Number(d.amount), 0) || 0,
      totalPending: pending.data?.reduce((s, d) => s + Number(d.amount), 0) || 0,
      totalRejected: rejected.data?.reduce((s, d) => s + Number(d.amount), 0) || 0,
      count: (approved.data?.length || 0) + (pending.data?.length || 0) + (rejected.data?.length || 0),
    });
  };

  const loadDeposits = async () => {
    try {
      let query = supabase
        .from("wallet_deposits")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const withProfiles = await Promise.all(
        (data || []).map(async (d) => {
          const { data: p } = await supabase
            .from("profiles").select("name, phone_number").eq("id", d.user_id).maybeSingle();
          return { ...d, profiles: p || { name: "Unknown", phone_number: "" } };
        })
      );
      setDeposits(withProfiles);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditForDeposit = async (depositId: string) => {
    const { data } = await supabase
      .from("deposit_audit_log")
      .select("*")
      .eq("deposit_id", depositId)
      .order("created_at", { ascending: false });
    if (!data) return;

    const actorIds = [...new Set(data.map((r) => r.actor_id).filter(Boolean))] as string[];
    let namesById: Record<string, string> = {};
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, name").in("id", actorIds);
      namesById = Object.fromEntries((profs || []).map((p) => [p.id, p.name]));
    }
    setAuditByDeposit((prev) => ({
      ...prev,
      [depositId]: data.map((r: any) => ({
        ...r,
        actor_name: r.actor_id ? namesById[r.actor_id] || "Admin" : "System",
      })),
    }));
  };

  const viewScreenshot = async (deposit: Deposit) => {
    try {
      const { data } = await supabase.storage
        .from("deposit-screenshots")
        .createSignedUrl(deposit.screenshot_url, 3600);
      if (data?.signedUrl) {
        setScreenshotUrl(data.signedUrl);
        setShowScreenshot(true);
      }
    } catch {
      toast.error("Failed to load screenshot");
    }
  };

  const processDeposit = async (
    id: string,
    action: "approve" | "reject",
    notes: string | null
  ) => {
    const { data, error } = await supabase.rpc("admin_process_deposit", {
      p_deposit_id: id,
      p_action: action,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  };

  const handleApprove = async () => {
    if (!selectedDeposit) return;
    setProcessing(true);
    try {
      await processDeposit(selectedDeposit.id, "approve", adminNotes || null);
      toast.success("Deposit approved");
      setSelectedDeposit(null);
      setAdminNotes("");
      loadDeposits();
      loadDepositStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit) return;
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    try {
      await processDeposit(selectedDeposit.id, "reject", adminNotes);
      toast.success("Deposit rejected");
      setSelectedDeposit(null);
      setAdminNotes("");
      loadDeposits();
      loadDepositStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  const runBulk = async (action: "approve" | "reject", notes: string | null) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setProcessing(true);
    let ok = 0, skipped = 0, failed = 0;
    for (const id of ids) {
      try {
        const res: any = await processDeposit(id, action, notes);
        if (res?.skipped) skipped++;
        else ok++;
      } catch {
        failed++;
      }
    }
    setProcessing(false);
    setBulkReasonOpen(false);
    setBulkReason("");
    setSelectedIds(new Set());
    loadDeposits();
    loadDepositStats();
    toast.success(
      `${action === "approve" ? "Approved" : "Rejected"} ${ok}` +
      (skipped ? ` • Skipped ${skipped}` : "") +
      (failed ? ` • Failed ${failed}` : "")
    );
  };

  const handleBulkApprove = () => setBulkApproveConfirmOpen(true);
  const confirmBulkApprove = async () => {
    await runBulk("approve", null);
    setBulkApproveConfirmOpen(false);
  };
  const openBulkReject = () => setBulkReasonOpen(true);
  const submitBulkReject = () => {
    if (!bulkReason.trim()) {
      toast.error("Rejection reason required");
      return;
    }
    runBulk("reject", bulkReason.trim());
  };

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("my-MM").format(amt) + " Ks";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredDeposits = useMemo(() =>
    deposits.filter((d) => {
      const name = d.profiles?.name?.toLowerCase() || "";
      const phone = d.profiles?.phone_number?.toLowerCase() || "";
      const tx = d.transaction_id?.toLowerCase() || "";
      const t = searchTerm.toLowerCase();
      return name.includes(t) || phone.includes(t) || tx.includes(t);
    }),
    [deposits, searchTerm]
  );

  const pendingCount = deposits.filter((d) => d.status === "pending").length;
  const pendingIdsVisible = filteredDeposits.filter((d) => d.status === "pending").map((d) => d.id);
  const allPendingSelected =
    pendingIdsVisible.length > 0 && pendingIdsVisible.every((id) => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIdsVisible));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectedDeposits = filteredDeposits.filter((d) => selectedIds.has(d.id));
  const selectedSum = selectedDeposits.reduce((s, d) => s + Number(d.amount), 0);

  const BulkSummary = ({ variant }: { variant: "approve" | "reject" }) => (
    <div className="space-y-3">
      <div className={`rounded-lg border p-3 ${
        variant === "approve"
          ? "border-green-500/40 bg-green-500/5"
          : "border-red-500/40 bg-red-500/5"
      }`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Count</span>
          <span className="font-semibold">{selectedDeposits.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Total amount</span>
          <span className={`font-bold ${variant === "approve" ? "text-green-500" : "text-red-500"}`}>
            {formatCurrency(selectedSum)}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Transaction IDs</p>
        <div className="max-h-40 overflow-y-auto rounded-md border border-border/50 bg-background/50 p-2 space-y-1">
          {selectedDeposits.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs gap-2">
              <span className="font-mono truncate">
                {d.transaction_id || <span className="text-muted-foreground italic">no tx id</span>}
              </span>
              <span className="text-muted-foreground shrink-0">
                {d.profiles?.name} • {formatCurrency(Number(d.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="hero-gaming py-6 px-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Deposit Requests</h1>
                {pendingCount > 0 && (
                  <p className="text-sm text-primary">{pendingCount} pending</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="gap-1"
            >
              <Settings2 className="h-4 w-4" />
              Alerts
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or transaction ID..."
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

        {/* Deposit Stats */}
        <div className="p-4 -mt-4 grid grid-cols-3 gap-2 mb-2">
          <div className="card-neon p-3 text-center">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-sm font-bold text-green-400">{depositStats.totalApproved.toLocaleString()} Ks</p>
          </div>
          <div className="card-neon p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-sm font-bold text-yellow-400">{depositStats.totalPending.toLocaleString()} Ks</p>
          </div>
          <div className="card-neon p-3 text-center">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-sm font-bold text-red-400">{depositStats.totalRejected.toLocaleString()} Ks</p>
          </div>
        </div>

        {/* Bulk toolbar */}
        {pendingIdsVisible.length > 0 && (
          <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/50 p-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allPendingSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all pending"
              />
              <span className="text-sm">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected • ${formatCurrency(selectedSum)}`
                  : `Select all ${pendingIdsVisible.length} pending`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedIds.size === 0 || processing}
                onClick={openBulkReject}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                className="btn-neon"
                disabled={selectedIds.size === 0 || processing}
                onClick={handleBulkApprove}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* Deposits List */}
        <div className="px-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No deposits found</div>
          ) : (
            filteredDeposits.map((d) => {
              const isPending = d.status === "pending";
              const isSelected = selectedIds.has(d.id);
              return (
                <div key={d.id} className={`card-neon p-4 ${isSelected ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-start gap-3 mb-3">
                    {isPending && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(d.id)}
                        className="mt-1"
                        aria-label="Select deposit"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{d.profiles?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{d.profiles?.phone_number}</p>
                        </div>
                        {getStatusBadge(d.status)}
                      </div>
                    </div>
                  </div>

                  {d.transaction_id && (
                    <div className="mb-3">
                      <Badge variant="outline" className="font-mono text-xs">TX ID: {d.transaction_id}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-neon">{formatCurrency(d.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(d.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewScreenshot(d)}>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      {isPending ? (
                        <Button size="sm" onClick={() => { setSelectedDeposit(d); setAdminNotes(""); }} className="btn-neon">
                          <Eye className="h-4 w-4 mr-1" /> Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedDeposit(d); loadAuditForDeposit(d.id); }}>
                          <History className="h-4 w-4 mr-1" /> Details
                        </Button>
                      )}
                    </div>
                  </div>

                  {d.admin_notes && (
                    <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      Note: {d.admin_notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Review / Details Dialog */}
        <Dialog
          open={!!selectedDeposit}
          onOpenChange={(open) => {
            if (!open) { setSelectedDeposit(null); setAdminNotes(""); }
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedDeposit?.status === "pending" ? "Review Deposit" : "Deposit Details"}
              </DialogTitle>
              <DialogDescription>
                {selectedDeposit?.status === "pending"
                  ? "Approve or reject this deposit request"
                  : "Full activity log for this deposit"}
              </DialogDescription>
            </DialogHeader>

            {selectedDeposit && (
              <div className="space-y-4">
                <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{selectedDeposit.profiles?.name}</p>
                    {getStatusBadge(selectedDeposit.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedDeposit.profiles?.phone_number}</p>
                  {selectedDeposit.transaction_id && (
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      Transaction ID: {selectedDeposit.transaction_id}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-neon mt-2">
                    {formatCurrency(selectedDeposit.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted {format(new Date(selectedDeposit.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>

                <Button variant="outline" className="w-full" onClick={() => viewScreenshot(selectedDeposit)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  View Payment Screenshot
                </Button>

                {/* Audit Log */}
                <Collapsible
                  defaultOpen={selectedDeposit.status !== "pending"}
                  onOpenChange={(open) => {
                    if (open) loadAuditForDeposit(selectedDeposit.id);
                  }}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Audit Log
                      </span>
                      <History className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {(auditByDeposit[selectedDeposit.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        No actions recorded yet
                      </p>
                    ) : (
                      auditByDeposit[selectedDeposit.id].map((a) => (
                        <div key={a.id} className="rounded-md border border-border/50 bg-background/50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-1">
                              {a.action === "approved" ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              {a.action.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(a.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            By <span className="text-foreground">{a.actor_name || "Admin"}</span>
                            {" • "}Amount <span className="text-foreground">{formatCurrency(Number(a.amount))}</span>
                            {a.transaction_id && (<><br />TX: <span className="font-mono">{a.transaction_id}</span></>)}
                          </div>
                          {a.notes && (
                            <p className="mt-2 text-xs bg-muted/40 rounded p-2">{a.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {selectedDeposit.status === "pending" && (
                  <div className="space-y-2">
                    <Label>Admin Notes (optional for approve, required for reject)</Label>
                    <Textarea
                      placeholder="Add notes..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                )}
              </div>
            )}

            {selectedDeposit?.status === "pending" && (
              <DialogFooter className="flex gap-2">
                <Button variant="destructive" onClick={handleReject} disabled={processing} className="flex-1">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={processing} className="flex-1 btn-neon">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk reject reason */}
        <Dialog open={bulkReasonOpen} onOpenChange={setBulkReasonOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Reject {selectedIds.size} deposit{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
              <DialogDescription>Provide a reason applied to every selected deposit.</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection..."
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="bg-background/50"
            />
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkReasonOpen(false)} disabled={processing} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={submitBulkReject} disabled={processing} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Confirm Reject
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
                <img src={screenshotUrl} alt="Payment" className="w-full rounded-lg" />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Notification Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Deposit Alert Settings</DialogTitle>
              <DialogDescription>
                Control admin notifications for incoming deposits. Applies only to your account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-3">
                <div className="flex items-center gap-3">
                  {prefs.deposit_sound_enabled ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Notification sound</p>
                    <p className="text-xs text-muted-foreground">Play a beep on new deposits</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.deposit_sound_enabled}
                  onCheckedChange={(v) => updatePrefs({ deposit_sound_enabled: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-3">
                <div className="flex items-center gap-3">
                  {prefs.deposit_badge_enabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Red-dot / badge</p>
                    <p className="text-xs text-muted-foreground">Show pending count on the More tab</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.deposit_badge_enabled}
                  onCheckedChange={(v) => updatePrefs({ deposit_badge_enabled: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSettingsOpen(false)} className="w-full">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default DepositsManage;
