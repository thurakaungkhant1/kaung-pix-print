import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, ExternalLink, Loader2, Eye, X, ChevronDown, ChevronUp, 
  CheckSquare, Square, Check, XCircle, Search, Filter, Calendar, Copy,
  Gamepad2, Smartphone, Clock, CheckCircle2, Ban, Hourglass
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface Order {
  id: string;
  quantity: number;
  price: number;
  status: string;
  created_at: string;
  phone_number: string;
  delivery_address: string;
  payment_method: string;
  payment_proof_url: string | null;
  transaction_id: string | null;
  game_id: string | null;
  server_id: string | null;
  game_name: string | null;
  profiles: { name: string; phone_number: string };
  products: { name: string; image_url: string; points_value: number; category: string };
}

// Game categories that require game IDs
const GAME_CATEGORIES = ["MLBB Diamonds", "PUBG UC", "Free Fire", "Genshin", "Gift Cards"];
const MOBILE_CATEGORIES = ["Phone Top-up", "Data Plans"];

// Track loading and preview states per order
type LoadingState = { [orderId: string]: boolean };
type PreviewState = { [orderId: string]: string | null };
type ExpandedState = { [orderId: string]: boolean };

const OrdersManage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProofs, setLoadingProofs] = useState<LoadingState>({});
  const [previewUrls, setPreviewUrls] = useState<PreviewState>({});
  const [expandedPreviews, setExpandedPreviews] = useState<ExpandedState>({});
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; status: string }>({ open: false, status: "" });
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          order.id.toLowerCase().includes(query) ||
          order.profiles.name.toLowerCase().includes(query) ||
          order.phone_number.toLowerCase().includes(query) ||
          order.profiles.phone_number.toLowerCase().includes(query) ||
          order.products.name.toLowerCase().includes(query) ||
          (order.transaction_id && order.transaction_id.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      
      // Payment method filter
      if (paymentFilter !== "all" && order.payment_method !== paymentFilter) {
        return false;
      }
      
      // Date range filter
      const orderDate = new Date(order.created_at);
      if (dateFrom && orderDate < dateFrom) {
        return false;
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (orderDate > endOfDay) {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFrom, dateTo]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo;

  // Load payment proof preview for an order
  const loadPaymentProofPreview = async (orderId: string, filePath: string) => {
    setLoadingProofs(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error || !data?.signedUrl) {
        toast({
          title: "Error",
          description: "Failed to load payment proof",
          variant: "destructive",
        });
        return;
      }

      setPreviewUrls(prev => ({ ...prev, [orderId]: data.signedUrl }));
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to access payment proof",
        variant: "destructive",
      });
    } finally {
      setLoadingProofs(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Toggle preview expansion
  const togglePreviewExpanded = (orderId: string) => {
    setExpandedPreviews(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Open payment proof in new tab
  const openInNewTab = (orderId: string) => {
    const url = previewUrls[orderId];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Toggle preview visibility (load if not loaded, or hide)
  const togglePreview = async (orderId: string, filePath: string) => {
    if (previewUrls[orderId]) {
      // Already loaded, just toggle visibility
      setPreviewUrls(prev => ({ ...prev, [orderId]: null }));
      setExpandedPreviews(prev => ({ ...prev, [orderId]: false }));
    } else {
      // Load the preview
      await loadPaymentProofPreview(orderId, filePath);
    }
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select all filtered orders
  const selectAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // Select only pending orders from filtered
  const selectPendingOrders = () => {
    const pendingIds = filteredOrders.filter(o => o.status === "pending").map(o => o.id);
    setSelectedOrders(new Set(pendingIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  // Bulk update order status
  const bulkUpdateStatus = async (status: string) => {
    if (selectedOrders.size === 0) return;
    
    setBulkUpdating(true);
    setConfirmDialog({ open: false, status: "" });

    try {
      const orderIds = Array.from(selectedOrders);
      
      // Update all selected orders
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .in("id", orderIds);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update orders",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${orderIds.length} order(s) updated to "${status}"`,
        });
        clearSelection();
        loadOrders();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (status: string) => {
    setConfirmDialog({ open: true, status });
  };

  useEffect(() => {
    checkAdmin();
    loadOrders();
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

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        profiles:user_id(name, phone_number),
        products:product_id(name, image_url, points_value, category)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data as any);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Order status updated",
      });
      loadOrders();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return (
          <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Finished
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1">
            <Check className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
            <Ban className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 gap-1">
            <Hourglass className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const isGameOrder = (category: string) => GAME_CATEGORIES.includes(category);
  const isMobileOrder = (category: string) => MOBILE_CATEGORIES.includes(category);
  const isMLBB = (category: string) => category === "MLBB Diamonds";

  const pendingCount = filteredOrders.filter(o => o.status === "pending").length;

  return (
    <MobileLayout className="pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Orders</h1>
          <Badge variant="secondary" className="ml-auto">
            {hasActiveFilters ? `${filteredOrders.length}/${orders.length}` : orders.length} orders
          </Badge>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="sticky top-[60px] z-30 bg-background border-b shadow-sm">
        <div className="max-w-screen-xl mx-auto p-3 space-y-3">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="kpay">KPay</SelectItem>
                <SelectItem value="wavepay">WavePay</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="w-[140px] justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, "MMM d") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="default" className="w-[140px] justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, "MMM d") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Bulk Actions Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Selection Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllOrders}
                className="gap-1"
              >
                {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? "Deselect All" : "Select All"}
              </Button>
              
              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectPendingOrders}
                  className="gap-1"
                >
                  <Square className="h-4 w-4" />
                  Pending ({pendingCount})
                </Button>
              )}
            </div>

            {/* Selection Info & Actions */}
            {selectedOrders.size > 0 && (
              <>
                <div className="h-6 w-px bg-border mx-1" />
                
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedOrders.size} selected
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-border mx-1" />

                {/* Bulk Action Buttons */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openConfirmDialog("approved")}
                  disabled={bulkUpdating}
                  className="gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openConfirmDialog("finished")}
                  disabled={bulkUpdating}
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                  Finish
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openConfirmDialog("cancelled")}
                  disabled={bulkUpdating}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
            
            {bulkUpdating && (
              <div className="flex items-center gap-2 ml-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Updating...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {hasActiveFilters ? (
              <>
                <p>No orders match your filters</p>
                <Button variant="link" onClick={clearFilters}>Clear filters</Button>
              </>
            ) : (
              <p>No orders found</p>
            )}
          </div>
        )}
        {filteredOrders.map((order) => (
          <Card 
            key={order.id}
            className={cn(
              "transition-all",
              selectedOrders.has(order.id) && "ring-2 ring-primary bg-primary/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Checkbox */}
                <div className="flex items-start pt-1">
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => toggleOrderSelection(order.id)}
                    className="h-5 w-5"
                  />
                </div>
                
                <img
                  src={order.products.image_url}
                  alt={order.products.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold">{order.products.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Customer: {order.profiles.name}
                    </p>
                  </div>
                  
                  <div className="space-y-1.5 text-sm">
                    {/* Game/Mobile ID Info */}
                    {isGameOrder(order.products.category) && order.game_id && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="text-sm">
                          {isMLBB(order.products.category) ? (
                            <span>
                              <span className="text-muted-foreground">ID:</span> <span className="font-medium">{order.game_id}</span>
                              <span className="mx-1.5 text-muted-foreground">•</span>
                              <span className="text-muted-foreground">Server:</span> <span className="font-medium">{order.server_id}</span>
                            </span>
                          ) : (
                            <span>
                              <span className="text-muted-foreground">Player ID:</span> <span className="font-medium">{order.game_id}</span>
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-auto text-xs shrink-0">
                          {order.game_name || order.products.category}
                        </Badge>
                      </div>
                    )}
                    
                    {isMobileOrder(order.products.category) && order.phone_number && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <Smartphone className="h-4 w-4 text-blue-500 shrink-0" />
                        <span>
                          <span className="text-muted-foreground">Phone:</span> <span className="font-medium">{order.phone_number}</span>
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs shrink-0 border-blue-500/30 text-blue-600">
                          {order.products.category}
                        </Badge>
                      </div>
                    )}

                    <p><strong>Customer Phone:</strong> {order.profiles.phone_number || order.phone_number}</p>
                    <p><strong>Address:</strong> {order.delivery_address}</p>
                    <p><strong>Payment:</strong> {order.payment_method.toUpperCase()}</p>
                    {order.transaction_id && (
                      <p className="flex items-center gap-2">
                        <strong>Transaction ID:</strong> 
                        <Badge variant="outline" className="font-mono text-sm bg-amber-500/10 text-amber-600 border-amber-500/30">
                          {order.transaction_id}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(order.transaction_id!);
                            toast({
                              title: "Copied!",
                              description: `Transaction ID ${order.transaction_id} copied to clipboard`,
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </p>
                    )}
                    
                    {/* Payment Proof Section */}
                    {order.payment_proof_url && (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePreview(order.id, order.payment_proof_url!)}
                            disabled={loadingProofs[order.id]}
                          >
                            {loadingProofs[order.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : previewUrls[order.id] ? (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Hide Proof
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Show Proof
                              </>
                            )}
                          </Button>
                          
                          {previewUrls[order.id] && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePreviewExpanded(order.id)}
                              >
                                {expandedPreviews[order.id] ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Collapse
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Expand
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openInNewTab(order.id)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {/* Inline Preview */}
                        {previewUrls[order.id] && (
                          <div 
                            className={cn(
                              "relative cursor-pointer transition-all duration-300 overflow-hidden rounded-lg border",
                              expandedPreviews[order.id] ? "max-h-[400px]" : "max-h-24"
                            )}
                            onClick={() => togglePreviewExpanded(order.id)}
                          >
                            <img
                              src={previewUrls[order.id]!}
                              alt="Payment proof"
                              className="w-full object-contain"
                              onError={() => {
                                toast({
                                  title: "Error",
                                  description: "Failed to load payment proof image",
                                  variant: "destructive",
                                });
                                setPreviewUrls(prev => ({ ...prev, [order.id]: null }));
                              }}
                            />
                            {!expandedPreviews[order.id] && (
                              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end justify-center pb-1">
                                <span className="text-xs text-muted-foreground">Click to expand</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span>Qty: {order.quantity}</span>
                    <span className="font-bold text-primary">
                      {order.price.toLocaleString()} MMK
                    </span>
                    <span className="text-green-600">
                      {order.products.points_value * order.quantity} pts
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {order.status === "finished" && (
                    <p className="text-xs text-green-600 font-semibold">
                      ✓ Points awarded to customer
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update {selectedOrders.size} order(s) to "{confirmDialog.status}"?
              {confirmDialog.status === "finished" && (
                <span className="block mt-2 text-green-600 font-medium">
                  Note: Points will be awarded to customers for finished orders.
                </span>
              )}
              {confirmDialog.status === "cancelled" && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This action cannot be easily undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkUpdateStatus(confirmDialog.status)}
              className={cn(
                confirmDialog.status === "approved" && "bg-blue-600 hover:bg-blue-700",
                confirmDialog.status === "finished" && "bg-green-600 hover:bg-green-700",
                confirmDialog.status === "cancelled" && "bg-destructive hover:bg-destructive/90"
              )}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default OrdersManage;