import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Flag,
  Search,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Ban,
  Eye,
  MessageSquare,
  User,
  Clock,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  report_type: string;
  reason: string;
  description: string | null;
  status: string;
  admin_action: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  reporter?: { name: string; email: string | null };
  reported_user?: { name: string; email: string | null };
  message?: { content: string } | null;
}

const ReportsManage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"dismiss" | "warning" | "temporary_ban" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });

  useEffect(() => {
    if (isAdmin) {
      loadReports();
    }
  }, [isAdmin, statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    
    let query = supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Load reporter and reported user profiles separately
    if (data && data.length > 0) {
      const reporterIds = [...new Set(data.map(r => r.reporter_id))];
      const reportedUserIds = [...new Set(data.map(r => r.reported_user_id))];
      const messageIds = data.filter(r => r.message_id).map(r => r.message_id) as string[];

      const [reporterProfiles, reportedProfiles, messages] = await Promise.all([
        supabase.from("profiles").select("id, name, email").in("id", reporterIds),
        supabase.from("profiles").select("id, name, email").in("id", reportedUserIds),
        messageIds.length > 0 
          ? supabase.from("messages").select("id, content").in("id", messageIds)
          : Promise.resolve({ data: [] as { id: string; content: string }[] })
      ]);

      const reporterMap = new Map<string, { id: string; name: string; email: string | null }>();
      reporterProfiles.data?.forEach(p => reporterMap.set(p.id, p));
      
      const reportedMap = new Map<string, { id: string; name: string; email: string | null }>();
      reportedProfiles.data?.forEach(p => reportedMap.set(p.id, p));
      
      const messageMap = new Map<string, { id: string; content: string }>();
      messages.data?.forEach(m => messageMap.set(m.id, m));

      const enrichedReports: Report[] = data.map(report => ({
        ...report,
        reporter: reporterMap.get(report.reporter_id),
        reported_user: reportedMap.get(report.reported_user_id),
        message: report.message_id ? messageMap.get(report.message_id) || null : null,
      }));

      setReports(enrichedReports);
    } else {
      setReports([]);
    }

    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedReport || !actionType || !user) return;
    
    setProcessing(true);

    try {
      // Update the report
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: "actioned",
          admin_action: actionType,
          admin_notes: adminNotes.trim() || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", selectedReport.id);

      if (reportError) throw reportError;

      // If taking action against user (warning or ban), update their account status
      if (actionType !== "dismiss") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ account_status: actionType })
          .eq("id", selectedReport.reported_user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Action completed",
        description: actionType === "dismiss" 
          ? "Report has been dismissed" 
          : `User has been ${actionType === "warning" ? "warned" : "temporarily banned"}`,
      });

      // Reset and reload
      setActionDialogOpen(false);
      setSelectedReport(null);
      setActionType(null);
      setAdminNotes("");
      loadReports();
    } catch (error: any) {
      console.error("Action error:", error);
      toast({
        title: "Action failed",
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (report: Report, action: "dismiss" | "warning" | "temporary_ban") => {
    setSelectedReport(report);
    setActionType(action);
    setAdminNotes("");
    setActionDialogOpen(true);
  };

  const openDetailDialog = (report: Report) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.reporter?.name?.toLowerCase().includes(query) ||
      report.reported_user?.name?.toLowerCase().includes(query) ||
      report.reason.toLowerCase().includes(query) ||
      report.message?.content?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "actioned":
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Actioned</Badge>;
      case "dismissed":
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getActionBadge = (action: string | null) => {
    if (!action) return null;
    switch (action) {
      case "dismiss":
        return <Badge variant="outline">Dismissed</Badge>;
      case "warning":
        return <Badge className="bg-amber-500"><AlertTriangle className="mr-1 h-3 w-3" />Warning</Badge>;
      case "temporary_ban":
        return <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />Temp Ban</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            <h1 className="text-xl font-display font-bold">Reported Messages</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name, reason, or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Reports ({filteredReports.length})
            </CardTitle>
            <CardDescription>Review and moderate user reports</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reported Content</TableHead>
                      <TableHead>Reported User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{report.reporter?.name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{report.reporter?.email || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {report.report_type === "message" && report.message ? (
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span className="text-sm line-clamp-2">{report.message.content}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Account Report</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{report.reported_user?.name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{report.reported_user?.email || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {report.reason.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(report.status)}
                            {report.admin_action && getActionBadge(report.admin_action)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailDialog(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === "pending" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openActionDialog(report, "dismiss")}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Dismiss Report
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(report, "warning")}>
                                    <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                                    Issue Warning
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openActionDialog(report, "temporary_ban")}
                                    className="text-destructive"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Temporary Ban
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Report Details
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reporter</p>
                  <p className="font-medium">{selectedReport.reporter?.name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported User</p>
                  <p className="font-medium">{selectedReport.reported_user?.name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Report Type</p>
                  <Badge variant="outline" className="capitalize">{selectedReport.report_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <Badge variant="outline" className="capitalize">{selectedReport.reason.replace(/_/g, " ")}</Badge>
                </div>
              </div>

              {selectedReport.message && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Reported Message:</p>
                  <p className="text-sm">{selectedReport.message.content}</p>
                </div>
              )}

              {selectedReport.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Additional Details:</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-sm">{new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedReport.admin_action && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Admin Action:</p>
                  {getActionBadge(selectedReport.admin_action)}
                  {selectedReport.admin_notes && (
                    <p className="text-sm mt-2">{selectedReport.admin_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "dismiss" && <CheckCircle className="h-5 w-5 text-muted-foreground" />}
              {actionType === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {actionType === "temporary_ban" && <Ban className="h-5 w-5 text-destructive" />}
              {actionType === "dismiss" ? "Dismiss Report" : actionType === "warning" ? "Issue Warning" : "Temporary Ban"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "dismiss" 
                ? "This will mark the report as resolved with no action taken."
                : actionType === "warning"
                ? `This will add a warning to ${selectedReport?.reported_user?.name || "the user"}'s account.`
                : `This will temporarily restrict ${selectedReport?.reported_user?.name || "the user"}'s account.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this action..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={cn(
                actionType === "dismiss" && "bg-muted-foreground",
                actionType === "warning" && "bg-amber-500 hover:bg-amber-600",
                actionType === "temporary_ban" && "bg-destructive hover:bg-destructive/90"
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm {actionType === "dismiss" ? "Dismiss" : actionType === "warning" ? "Warning" : "Ban"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsManage;