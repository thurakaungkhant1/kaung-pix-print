import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AdminBottomNav from "@/components/AdminBottomNav";
import AdminFAB from "@/components/AdminFAB";
import { Label } from "@/components/ui/label";
import {
  Package,
  Image,
  ShoppingCart,
  Users,
  Plus,
  Settings,
  Coins,
  Gem,
  LayoutDashboard,
  TrendingUp,
  Search,
  Eye,
  Ban,
  Trash2,
  ChevronRight,
  Menu,
  X,
  BarChart3,
  Calendar as CalendarIcon,
  Bell,
  Volume2,
  VolumeX,
  Phone,
  MapPin,
  Mail,
  User,
  Gamepad2,
  ExternalLink,
  Loader2,
  History,
  Crown,
  Copy,
  Check,
  Zap,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  email: string | null;
  points: number;
  created_at: string | null;
  referral_count: number;
}

interface Order {
  id: string;
  user_id: string;
  product_id: number;
  quantity: number;
  price: number;
  status: string;
  payment_method: string;
  payment_proof_url: string | null;
  created_at: string | null;
  phone_number: string;
  delivery_address: string;
  game_id: string | null;
  server_id: string | null;
  game_name: string | null;
  products?: { name: string };
  profiles?: { name: string; email: string | null; phone_number: string };
}

interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string | null;
  profiles?: { name: string; email: string | null };
}

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface UserGrowthData {
  date: string;
  users: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    photos: 0,
    orders: 0,
    users: 0,
    revenue: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });
  const [diamondStats, setDiamondStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [diamondRevenueData, setDiamondRevenueData] = useState<DailyRevenue[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [diamondStatusData, setDiamondStatusData] = useState<OrderStatusData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [diamondOrders, setDiamondOrders] = useState<Order[]>([]);
  const [pendingDiamondOrders, setPendingDiamondOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('admin-sound-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [loadingPaymentProof, setLoadingPaymentProof] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [paymentProofExpanded, setPaymentProofExpanded] = useState(false);
  const [editPointsOpen, setEditPointsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pointsChange, setPointsChange] = useState<string>("");
  const [pointsOperation, setPointsOperation] = useState<"add" | "subtract">("add");
  const [updatingPoints, setUpdatingPoints] = useState(false);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [historyDateFrom, setHistoryDateFrom] = useState<Date | undefined>(undefined);
  const [historyDateTo, setHistoryDateTo] = useState<Date | undefined>(undefined);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pendingPremiumRequests, setPendingPremiumRequests] = useState(0);
  const { isAdmin, user } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, fieldId: string) => {
    if (!text || text === "-") return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast({
        title: "Copied!",
        description: "Copied to clipboard",
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Generate a signed URL for viewing payment proof inline
  const loadPaymentProofPreview = async (filePath: string) => {
    setLoadingPaymentProof(true);
    setPaymentProofUrl(null);
    
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

      setPaymentProofUrl(data.signedUrl);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to access payment proof",
        variant: "destructive",
      });
    } finally {
      setLoadingPaymentProof(false);
    }
  };

  // Open payment proof in new tab (for full resolution view)
  const openPaymentProofInNewTab = () => {
    if (paymentProofUrl) {
      window.open(paymentProofUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Load payment proof when order is selected
  useEffect(() => {
    if (selectedOrder?.payment_proof_url) {
      loadPaymentProofPreview(selectedOrder.payment_proof_url);
      setPaymentProofExpanded(false);
    } else {
      setPaymentProofUrl(null);
    }
  }, [selectedOrder?.id]);

  // Save sound preference
  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('admin-sound-enabled', String(enabled));
    toast({
      title: enabled ? "Sound Enabled" : "Sound Disabled",
      description: enabled ? "You'll hear notifications for new orders" : "Notification sounds are now muted",
    });
  };

  // Notification sound function
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant two-tone notification sound
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      playTone(880, now, 0.15); // A5
      playTone(1174.66, now + 0.15, 0.15); // D6
      playTone(1318.51, now + 0.3, 0.2); // E6
      
      // Close audio context after sound plays
      setTimeout(() => audioContext.close(), 1000);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Admin check is now handled by useAdminCheck hook

  const loadPointTransactions = async () => {
    const { data } = await supabase
      .from("point_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (data) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      // Map profiles to transactions
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const transactionsWithProfiles = data.map(transaction => ({
        ...transaction,
        profiles: profilesMap.get(transaction.user_id) || { name: "Unknown", email: null }
      }));

      setPointTransactions(transactionsWithProfiles);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
      loadOrders();
      loadDiamondOrders();
      loadRevenueData();
      loadOrderStatusData();
      loadUserGrowthData();
      loadDiamondAnalytics();
      loadPointTransactions();
      loadPendingPremiumRequests();
    }
  }, [isAdmin]);

  // Load pending premium requests count
  const loadPendingPremiumRequests = async () => {
    const { count } = await supabase
      .from("premium_purchase_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    
    setPendingPremiumRequests(count || 0);
  };

  // Real-time order notifications
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('New order received:', payload);
          
          // Play notification sound
          playNotificationSound();
          
          // Fetch product name for the new order
          const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', payload.new.product_id)
            .single();

          toast({
            title: "🔔 New Order Received!",
            description: `${product?.name || 'Product'} - ${Number(payload.new.price).toLocaleString()} MMK`,
            duration: 5000,
          });

          // Refresh data
          loadOrders();
          loadDiamondOrders();
          loadDiamondAnalytics();
          loadStats();
          loadOrderStatusData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order updated:', payload);
          loadOrders();
          loadDiamondOrders();
          loadDiamondAnalytics();
          loadStats();
          loadOrderStatusData();
          loadRevenueData();
        }
      )
      .subscribe();

    // Real-time premium request notifications
    const premiumChannel = supabase
      .channel('admin-premium-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'premium_purchase_requests'
        },
        async (payload) => {
          console.log('New premium request received:', payload);
          
          // Play notification sound
          playNotificationSound();
          
          // Fetch user name and plan details
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.user_id)
            .single();

          const { data: plan } = await supabase
            .from('premium_plans')
            .select('name')
            .eq('id', payload.new.plan_id)
            .single();

          toast({
            title: "👑 New Premium Request!",
            description: `${profile?.name || 'User'} requested ${plan?.name || 'Premium Plan'}`,
            duration: 5000,
          });

          // Refresh premium requests count
          loadPendingPremiumRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(premiumChannel);
    };
  }, [isAdmin]);

  // checkAdmin function removed - now handled by useAdminCheck hook

  const loadStats = async () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [products, photos, orders, profiles, allRevenue, pendingData, todayOrders, weekOrders, monthOrders] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("price").eq("status", "approved"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("price").eq("status", "approved").gte("created_at", startOfToday),
      supabase.from("orders").select("price").eq("status", "approved").gte("created_at", startOfWeek),
      supabase.from("orders").select("price").eq("status", "approved").gte("created_at", startOfMonth),
    ]);

    const totalRevenue = allRevenue.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const todayRevenue = todayOrders.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const weekRevenue = weekOrders.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const monthRevenue = monthOrders.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      products: products.count || 0,
      photos: photos.count || 0,
      orders: orders.count || 0,
      users: profiles.count || 0,
      revenue: totalRevenue,
      pendingOrders: pendingData.count || 0,
      todayRevenue,
      weekRevenue,
      monthRevenue,
    });
  };

  const loadRevenueData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("orders")
      .select("price, created_at")
      .eq("status", "approved")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (data) {
      const grouped: { [key: string]: { revenue: number; orders: number } } = {};
      data.forEach((order) => {
        const date = new Date(order.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0 };
        grouped[date].revenue += Number(order.price);
        grouped[date].orders += 1;
      });

      setRevenueData(
        Object.entries(grouped).map(([date, values]) => ({
          date,
          revenue: values.revenue,
          orders: values.orders,
        }))
      );
    }
  };

  const loadOrderStatusData = async () => {
    const { data } = await supabase.from("orders").select("status");

    if (data) {
      const counts: { [key: string]: number } = { pending: 0, approved: 0, rejected: 0 };
      data.forEach((order) => {
        if (counts[order.status] !== undefined) counts[order.status]++;
      });

      setOrderStatusData([
        { name: "Pending", value: counts.pending, color: "hsl(var(--chart-2))" },
        { name: "Approved", value: counts.approved, color: "hsl(var(--chart-1))" },
        { name: "Rejected", value: counts.rejected, color: "hsl(var(--destructive))" },
      ]);
    }
  };

  const loadUserGrowthData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (data) {
      const grouped: { [key: string]: number } = {};
      data.forEach((profile) => {
        const date = new Date(profile.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        grouped[date] = (grouped[date] || 0) + 1;
      });

      // Cumulative count
      let cumulative = 0;
      setUserGrowthData(
        Object.entries(grouped).map(([date, count]) => {
          cumulative += count;
          return { date, users: cumulative };
        })
      );
    }
  };

  const loadDiamondAnalytics = async () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch diamond orders stats
    const [allDiamondOrders, approvedDiamondOrders, pendingDiamondOrders, todayDiamond, weekDiamond, monthDiamond] = await Promise.all([
      supabase.from("orders").select("id, price, status", { count: "exact" }).not("game_id", "is", null),
      supabase.from("orders").select("price").not("game_id", "is", null).eq("status", "approved"),
      supabase.from("orders").select("id", { count: "exact", head: true }).not("game_id", "is", null).eq("status", "pending"),
      supabase.from("orders").select("price").not("game_id", "is", null).eq("status", "approved").gte("created_at", startOfToday),
      supabase.from("orders").select("price").not("game_id", "is", null).eq("status", "approved").gte("created_at", startOfWeek),
      supabase.from("orders").select("price").not("game_id", "is", null).eq("status", "approved").gte("created_at", startOfMonth),
    ]);

    const totalRevenue = approvedDiamondOrders.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const todayRevenue = todayDiamond.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const weekRevenue = weekDiamond.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;
    const monthRevenue = monthDiamond.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    // Count status distribution
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    allDiamondOrders.data?.forEach((order) => {
      if (statusCounts[order.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[order.status as keyof typeof statusCounts]++;
      }
    });

    setDiamondStats({
      totalOrders: allDiamondOrders.count || 0,
      totalRevenue,
      pendingOrders: pendingDiamondOrders.count || 0,
      approvedOrders: statusCounts.approved,
      todayRevenue,
      weekRevenue,
      monthRevenue,
    });

    setDiamondStatusData([
      { name: "Pending", value: statusCounts.pending, color: "hsl(var(--chart-2))" },
      { name: "Approved", value: statusCounts.approved, color: "hsl(var(--chart-1))" },
      { name: "Rejected", value: statusCounts.rejected, color: "hsl(var(--destructive))" },
    ]);

    // Fetch revenue trend data for diamonds
    const { data: trendData } = await supabase
      .from("orders")
      .select("price, created_at")
      .not("game_id", "is", null)
      .eq("status", "approved")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (trendData) {
      const grouped: { [key: string]: { revenue: number; orders: number } } = {};
      trendData.forEach((order) => {
        const date = new Date(order.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0 };
        grouped[date].revenue += Number(order.price);
        grouped[date].orders += 1;
      });

      setDiamondRevenueData(
        Object.entries(grouped).map(([date, values]) => ({
          date,
          revenue: values.revenue,
          orders: values.orders,
        }))
      );
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Count referrals for each user
      const userIds = data.map(u => u.id);
      const { data: referralCounts } = await supabase
        .from("profiles")
        .select("referred_by")
        .in("referred_by", userIds);

      // Create a map of referral counts
      const countMap: { [key: string]: number } = {};
      referralCounts?.forEach(r => {
        if (r.referred_by) {
          countMap[r.referred_by] = (countMap[r.referred_by] || 0) + 1;
        }
      });

      // Add referral count to each user
      const usersWithReferrals = data.map(user => ({
        ...user,
        referral_count: countMap[user.id] || 0
      }));

      setUsers(usersWithReferrals);
    }
  };

  const loadOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`*, products(name)`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (ordersData) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, phone_number")
        .in("id", userIds);

      // Map profiles to orders
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const ordersWithProfiles = ordersData.map(order => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || { name: "Unknown", email: null, phone_number: "" }
      }));

      setOrders(ordersWithProfiles as Order[]);
    }
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const loadDiamondOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`*, products(name)`)
      .not("game_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (ordersData) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, phone_number")
        .in("id", userIds);

      // Map profiles to orders
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const ordersWithProfiles = ordersData.map(order => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || { name: "Unknown", email: null, phone_number: "" }
      }));

      setDiamondOrders(ordersWithProfiles as Order[]);
      
      // Count pending diamond orders
      const pendingCount = ordersData.filter(o => o.status === "pending").length;
      setPendingDiamondOrders(pendingCount);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Order status updated" });
      loadOrders();
      loadDiamondOrders();
      loadStats();
    }
  };

  const deleteUser = async (userId: string) => {
    // Note: This would need proper auth admin setup
    toast({ title: "Info", description: "User deletion requires backend admin setup" });
  };

  const openEditPointsModal = (user: UserProfile) => {
    setSelectedUser(user);
    setPointsChange("");
    setPointsOperation("add");
    setEditPointsOpen(true);
  };

  const updateUserPoints = async () => {
    if (!selectedUser || !pointsChange) return;
    
    const changeAmount = parseInt(pointsChange);
    if (isNaN(changeAmount) || changeAmount <= 0) {
      toast({ title: "Error", description: "Please enter a valid positive number", variant: "destructive" });
      return;
    }

    const newPoints = pointsOperation === "add" 
      ? selectedUser.points + changeAmount 
      : Math.max(0, selectedUser.points - changeAmount);

    setUpdatingPoints(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("id", selectedUser.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
      } else {
        // Create a point transaction record
        await supabase.from("point_transactions").insert({
          user_id: selectedUser.id,
          amount: pointsOperation === "add" ? changeAmount : -changeAmount,
          transaction_type: "admin_adjustment",
          description: `Admin ${pointsOperation === "add" ? "added" : "subtracted"} ${changeAmount} points`
        });

        toast({ 
          title: "Success", 
          description: `${pointsOperation === "add" ? "Added" : "Subtracted"} ${changeAmount} points. New balance: ${newPoints}` 
        });
        setEditPointsOpen(false);
        loadUsers();
        loadPointTransactions();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
    } finally {
      setUpdatingPoints(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(query) ||
      o.products?.name?.toLowerCase().includes(query) ||
      o.profiles?.name?.toLowerCase().includes(query) ||
      o.profiles?.email?.toLowerCase().includes(query) ||
      o.phone_number?.toLowerCase().includes(query)
    );
  });

  const filteredDiamondOrders = diamondOrders.filter((o) => {
    const query = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(query) ||
      o.products?.name?.toLowerCase().includes(query) ||
      o.profiles?.name?.toLowerCase().includes(query) ||
      o.profiles?.email?.toLowerCase().includes(query) ||
      o.game_id?.toLowerCase().includes(query) ||
      o.game_name?.toLowerCase().includes(query)
    );
  });


  if (!isAdmin) return null;

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    { id: "users", label: "Users", icon: Users, badge: 0 },
    { id: "deposits", label: "Deposits", icon: Wallet, badge: 0, route: "/admin/deposits" },
    { id: "point-management", label: "Point Management", icon: Coins, badge: 0 },
    { id: "point-history", label: "Point History", icon: History, badge: 0 },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: stats.pendingOrders },
    { id: "diamond-orders", label: "Game Orders", icon: Gamepad2, badge: pendingDiamondOrders },
    { id: "shop", label: "Shop Management", icon: Package, badge: 0 },
    { id: "products", label: "Products", icon: Package, badge: 0, route: "/admin/products" },
    { id: "mobile-services", label: "Mobile Services", icon: Phone, badge: 0, route: "/admin/mobile-services" },
    { id: "photos", label: "Photos", icon: Image, badge: 0 },
    { id: "background-music", label: "Background Music", icon: Volume2, badge: 0, route: "/admin/background-music" },
    { id: "settings", label: "Settings", icon: Settings, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background flex pb-16 lg:pb-0">
      {/* Sidebar - Hidden on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border",
          "transform transition-transform duration-300",
          "hidden lg:block lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-display font-bold text-primary">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if ((item as any).route) {
                  navigate((item as any).route);
                } else {
                  setActiveTab(item.id);
                }
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl",
                "transition-all duration-200",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className={cn(
                  "h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full",
                  activeTab === item.id
                    ? "bg-primary-foreground text-primary"
                    : "bg-destructive text-destructive-foreground"
                )}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/account")}
          >
            Back to App
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold capitalize">{activeTab.replace("-", " ")}</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button
                onClick={() => setActiveTab("orders")}
                className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                {stats.pendingOrders > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full animate-pulse">
                    {stats.pendingOrders > 9 ? '9+' : stats.pendingOrders}
                  </span>
                )}
              </button>

              {(activeTab === "users" || activeTab === "orders" || activeTab === "diamond-orders" || activeTab === "point-management" || activeTab === "point-history") && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500" },
                  { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-green-500" },
                  { label: "Total Revenue", value: `${stats.revenue.toLocaleString()} MMK`, icon: TrendingUp, color: "text-primary" },
                  { label: "Pending Orders", value: stats.pendingOrders, icon: Coins, color: "text-orange-500" },
                ].map((stat) => (
                  <Card key={stat.label} className="premium-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-muted", stat.color)}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Revenue Period Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="premium-card border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Revenue</p>
                        <p className="text-xl font-bold text-green-500">{stats.todayRevenue.toLocaleString()} MMK</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">This Week</p>
                        <p className="text-xl font-bold text-blue-500">{stats.weekRevenue.toLocaleString()} MMK</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-xl font-bold text-primary">{stats.monthRevenue.toLocaleString()} MMK</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Revenue Trend (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} MMK`, 'Revenue']}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            fill="url(#revenueGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Status Chart */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Order Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Orders Chart */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Daily Orders (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* User Growth Chart */}
                <Card className="premium-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      New User Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={userGrowthData}>
                          <defs>
                            <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stroke="hsl(var(--chart-1))"
                            fill="url(#userGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Diamond Sales Analytics Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Gem className="h-5 w-5 text-primary" />
                  Diamond Sales Analytics
                </h3>

                {/* Diamond Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="premium-card border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Gem className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Diamond Orders</p>
                          <p className="text-xl font-bold">{diamondStats.totalOrders}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="premium-card border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Diamond Revenue</p>
                          <p className="text-xl font-bold text-green-500">{diamondStats.totalRevenue.toLocaleString()} MMK</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="premium-card border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Coins className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Diamond Orders</p>
                          <p className="text-xl font-bold text-orange-500">{diamondStats.pendingOrders}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="premium-card border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">This Month</p>
                          <p className="text-xl font-bold text-blue-500">{diamondStats.monthRevenue.toLocaleString()} MMK</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Diamond Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Diamond Revenue Trend */}
                  <Card className="premium-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gem className="h-5 w-5 text-purple-500" />
                        Diamond Sales Trend (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={diamondRevenueData}>
                            <defs>
                              <linearGradient id="diamondGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`${value.toLocaleString()} MMK`, 'Revenue']}
                            />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="hsl(280, 80%, 60%)"
                              fill="url(#diamondGradient)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Diamond Order Status Distribution */}
                  <Card className="premium-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gem className="h-5 w-5 text-purple-500" />
                        Diamond Order Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={diamondStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {diamondStatusData.map((entry, index) => (
                                <Cell key={`diamond-cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Daily Diamond Orders */}
                  <Card className="premium-card lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                        Daily Diamond Orders (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={diamondRevenueData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="orders" fill="hsl(280, 80%, 60%)" radius={[4, 4, 0, 0]} name="Diamond Orders" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Quick Actions */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button onClick={() => navigate("/admin/products/new")} className="h-auto py-4 flex-col gap-2">
                    <Plus className="h-5 w-5" />
                    Add Product
                  </Button>
                  <Button onClick={() => navigate("/admin/photos/new")} variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Image className="h-5 w-5" />
                    Upload Photo
                  </Button>
                  <Button onClick={() => setActiveTab("orders")} variant="outline" className="h-auto py-4 flex-col gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    View Orders
                  </Button>
                  <Button onClick={() => setActiveTab("users")} variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Users className="h-5 w-5" />
                    View Users
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Orders Preview */}
              <Card className="premium-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div>
                          <p className="font-medium">{order.products?.name || "Product"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at || "").toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{Number(order.price).toLocaleString()} MMK</p>
                          <Badge variant={order.status === "approved" ? "default" : order.status === "pending" ? "secondary" : "destructive"}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <Card className="premium-card">
              <CardHeader>
                <CardTitle>All Users ({filteredUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Invited Users</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.name}</TableCell>
                          <TableCell>{profile.email || "-"}</TableCell>
                          <TableCell>{profile.phone_number}</TableCell>
                          <TableCell>{profile.points.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={profile.referral_count > 0 ? "default" : "secondary"}>
                              {profile.referral_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {profile.created_at
                              ? new Date(profile.created_at).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/profile/${profile.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditPointsModal(profile)}
                              >
                                <Coins className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteUser(profile.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Point Management Tab */}
          {activeTab === "point-management" && (
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Point Management ({filteredUsers.length} Users)
                </CardTitle>
                <CardDescription>
                  View and manage user points. Click "Edit Points" to add or subtract points from a user's balance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Current Points</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.name}</TableCell>
                          <TableCell>{profile.email || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-primary">{profile.points.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {profile.created_at
                              ? new Date(profile.created_at).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => openEditPointsModal(profile)}
                              className="gap-1"
                            >
                              <Coins className="h-4 w-4" />
                              Edit Points
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Point History Tab */}
          {activeTab === "point-history" && (
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Point Transaction History
                </CardTitle>
                <CardDescription>
                  View all point adjustments including purchases, referrals, spins, and admin changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range Filters */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by date:</span>
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !historyDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDateFrom ? format(historyDateFrom, "MMM d, yyyy") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={historyDateFrom}
                        onSelect={setHistoryDateFrom}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-muted-foreground">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !historyDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historyDateTo ? format(historyDateTo, "MMM d, yyyy") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={historyDateTo}
                        onSelect={setHistoryDateTo}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>

                  {(historyDateFrom || historyDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHistoryDateFrom(undefined);
                        setHistoryDateTo(undefined);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pointTransactions
                        .filter(t => {
                          // Search filter
                          if (searchQuery) {
                            const query = searchQuery.toLowerCase();
                            const matchesSearch = 
                              t.profiles?.name?.toLowerCase().includes(query) ||
                              t.profiles?.email?.toLowerCase().includes(query) ||
                              t.transaction_type?.toLowerCase().includes(query) ||
                              t.description?.toLowerCase().includes(query);
                            if (!matchesSearch) return false;
                          }
                          
                          // Date range filter
                          if (t.created_at) {
                            const transactionDate = new Date(t.created_at);
                            if (historyDateFrom) {
                              const startOfFrom = new Date(historyDateFrom);
                              startOfFrom.setHours(0, 0, 0, 0);
                              if (transactionDate < startOfFrom) return false;
                            }
                            if (historyDateTo) {
                              const endOfTo = new Date(historyDateTo);
                              endOfTo.setHours(23, 59, 59, 999);
                              if (transactionDate > endOfTo) return false;
                            }
                          }
                          
                          return true;
                        })
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-sm">
                              {transaction.created_at
                                ? new Date(transaction.created_at).toLocaleString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{transaction.profiles?.name || "Unknown"}</span>
                                <span className="text-xs text-muted-foreground">{transaction.profiles?.email || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                transaction.transaction_type === "admin_adjustment" ? "default" :
                                transaction.transaction_type === "purchase" ? "secondary" :
                                transaction.transaction_type === "referral" ? "outline" :
                                transaction.transaction_type === "spin" ? "outline" :
                                "secondary"
                              }>
                                {transaction.transaction_type.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-semibold",
                                transaction.amount > 0 ? "text-green-500" : "text-destructive"
                              )}>
                                {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {transaction.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "orders" && (
            <>
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{order.profiles?.name || "Unknown"}</span>
                                <span className="text-xs text-muted-foreground">{order.profiles?.email || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-sm group">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{order.phone_number || "-"}</span>
                                  {order.phone_number && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => copyToClipboard(order.phone_number, `phone-${order.id}`)}
                                    >
                                      {copiedField === `phone-${order.id}` ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-start gap-1 text-xs text-muted-foreground max-w-[180px] group">
                                  <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{order.delivery_address || "-"}</span>
                                  {order.delivery_address && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      onClick={() => copyToClipboard(order.delivery_address, `address-${order.id}`)}
                                    >
                                      {copiedField === `address-${order.id}` ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{order.products?.name || "Product"}</span>
                                <span className="text-xs text-muted-foreground">Qty: {order.quantity}</span>
                              </div>
                            </TableCell>
                            <TableCell>{Number(order.price).toLocaleString()} MMK</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === "approved"
                                    ? "default"
                                    : order.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewOrderDetails(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                                >
                                  <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Order Detail Dialog */}
              <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Order Details
                    </DialogTitle>
                  </DialogHeader>
                  {selectedOrder && (
                    <div className="space-y-6">
                      {/* Order Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Order ID</p>
                          <p className="font-mono text-sm">{selectedOrder.id}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">
                            {selectedOrder.created_at
                              ? new Date(selectedOrder.created_at).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge
                            variant={
                              selectedOrder.status === "approved"
                                ? "default"
                                : selectedOrder.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {selectedOrder.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="font-medium capitalize">{selectedOrder.payment_method}</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Customer Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Name</p>
                              <p className="font-medium">{selectedOrder.profiles?.name || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">{selectedOrder.profiles?.email || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">Phone Number</p>
                              <p className="font-medium">{selectedOrder.phone_number || "-"}</p>
                            </div>
                            {selectedOrder.phone_number && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(selectedOrder.phone_number, `detail-phone-${selectedOrder.id}`)}
                              >
                                {copiedField === `detail-phone-${selectedOrder.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">Delivery Address</p>
                              <p className="font-medium">{selectedOrder.delivery_address || "-"}</p>
                            </div>
                            {selectedOrder.delivery_address && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(selectedOrder.delivery_address, `detail-address-${selectedOrder.id}`)}
                              >
                                {copiedField === `detail-address-${selectedOrder.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Product Details
                        </h4>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{selectedOrder.products?.name || "Product"}</p>
                            <p className="text-sm text-muted-foreground">Quantity: {selectedOrder.quantity}</p>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {Number(selectedOrder.price).toLocaleString()} MMK
                          </p>
                        </div>
                      </div>

                      {/* Game Info (for MLBB orders) */}
                      {selectedOrder.game_id && (
                        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Gamepad2 className="h-4 w-4" />
                            Game Information
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Game ID</p>
                              <p className="font-medium">{selectedOrder.game_id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Server ID</p>
                              <p className="font-medium">{selectedOrder.server_id || "-"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Game Name</p>
                              <p className="font-medium">{selectedOrder.game_name || "-"}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Proof */}
                      {selectedOrder.payment_proof_url && (
                        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Payment Proof</h4>
                            {paymentProofUrl && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPaymentProofExpanded(!paymentProofExpanded)}
                                >
                                  {paymentProofExpanded ? (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Collapse
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Expand
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={openPaymentProofInNewTab}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Open
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {loadingPaymentProof ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
                            </div>
                          ) : paymentProofUrl ? (
                            <div 
                              className={cn(
                                "relative cursor-pointer transition-all duration-300 overflow-hidden rounded-lg border",
                                paymentProofExpanded ? "max-h-[500px]" : "max-h-32"
                              )}
                              onClick={() => setPaymentProofExpanded(!paymentProofExpanded)}
                            >
                              <img
                                src={paymentProofUrl}
                                alt="Payment proof"
                                className="w-full object-contain"
                                onError={() => {
                                  toast({
                                    title: "Error",
                                    description: "Failed to load payment proof image",
                                    variant: "destructive",
                                  });
                                  setPaymentProofUrl(null);
                                }}
                              />
                              {!paymentProofExpanded && (
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end justify-center pb-2">
                                  <span className="text-xs text-muted-foreground">Click to expand</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Unable to load payment proof</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2">
                        <Select
                          value={selectedOrder.status}
                          onValueChange={(value) => {
                            updateOrderStatus(selectedOrder.id, value);
                            setSelectedOrder({ ...selectedOrder, status: value });
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Diamond Orders Tab */}
          {activeTab === "diamond-orders" && (
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-primary" />
                  Diamond Orders ({filteredDiamondOrders.length})
                  {pendingDiamondOrders > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingDiamondOrders} Pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Game Info</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDiamondOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{order.profiles?.name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{order.profiles?.email || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{order.game_name || "-"}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {order.game_id} | Server: {order.server_id || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{order.products?.name || "Diamond Package"}</TableCell>
                          <TableCell>{Number(order.price).toLocaleString()} MMK</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "approved"
                                  ? "default"
                                  : order.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => viewOrderDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Select
                                value={order.status}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredDiamondOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No diamond orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={() => navigate("/admin/products/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Product
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/products")}>
                  Manage Products
                </Button>
              </div>
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/admin/diamond-packages")}>
                    <Gem className="mr-2 h-4 w-4" />
                    MLBB Diamond Packages
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Shop Management Tab */}
          {activeTab === "shop" && (
            <div className="space-y-6">
              {/* Shop Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="premium-card border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-xl font-bold">{stats.products}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-xl font-bold">{stats.orders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Game Orders</p>
                        <p className="text-xl font-bold">{diamondStats.totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="premium-card border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold">{(stats.revenue + diamondStats.totalRevenue).toLocaleString()} Ks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Manage your shop products and categories</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Button onClick={() => navigate("/admin/products/new")} className="h-auto py-4 flex-col gap-2">
                    <Plus className="h-5 w-5" />
                    Add Product
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/admin/products")} className="h-auto py-4 flex-col gap-2">
                    <Package className="h-5 w-5" />
                    Manage Products
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/admin/diamond-packages")} className="h-auto py-4 flex-col gap-2">
                    <Gem className="h-5 w-5" />
                    Diamond Packages
                  </Button>
                </CardContent>
              </Card>

              {/* Product Categories */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Product Categories
                  </CardTitle>
                  <CardDescription>Organize products by type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Game Items Section */}
                  <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Game Items (Digital)</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      In-game currencies, skins, gift cards - instant delivery with Player ID
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                          <Gem className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">MLBB Diamonds</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center">
                          <Gamepad2 className="h-4 w-4 text-yellow-500" />
                        </div>
                        <span className="text-sm">PUBG UC</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-orange-500" />
                        </div>
                        <span className="text-sm">Free Fire</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                          <Package className="h-4 w-4 text-purple-500" />
                        </div>
                        <span className="text-sm">Genshin</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Services Section */}
                  <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold">Mobile Services</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Phone bill top-ups and mobile data plans - requires phone number
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="text-sm">Phone Top-up</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                          <ExternalLink className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Data Plans</span>
                      </div>
                    </div>
                  </div>

                  {/* Physical Products Section */}
                  <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Physical Products</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Merchandise, accessories - requires shipping address
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")}>
                      View All Products
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Game Orders */}
              <Card className="premium-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                      Recent Game Orders
                    </CardTitle>
                    <CardDescription>Latest game top-up orders</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("diamond-orders")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {diamondOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Gamepad2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{order.game_name || "Game Top-up"}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {order.game_id} | Server: {order.server_id || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{Number(order.price).toLocaleString()} Ks</p>
                          <Badge variant={order.status === "approved" ? "default" : order.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {diamondOrders.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No game orders yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={() => navigate("/admin/photos/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Photos
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/photos")}>
                  Manage Photos
                </Button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Notification Settings */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how you receive notifications for new orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {soundEnabled ? (
                        <Volume2 className="h-5 w-5 text-primary" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <Label htmlFor="sound-toggle" className="font-medium">
                          Order Notification Sound
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Play a sound when new orders arrive
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="sound-toggle"
                      checked={soundEnabled}
                      onCheckedChange={toggleSound}
                    />
                  </div>
                  
                  {soundEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={playNotificationSound}
                      className="gap-2"
                    >
                      <Volume2 className="h-4 w-4" />
                      Test Sound
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* System Settings */}
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/admin/withdrawal-settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Withdrawal Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/admin/withdrawal-items")}
                  >
                    <Coins className="mr-2 h-4 w-4" />
                    Exchange Items
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Edit Points Modal */}
      <Dialog open={editPointsOpen} onOpenChange={setEditPointsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Edit User Points
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                {selectedUser.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {selectedUser.email}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="text-lg font-bold text-primary">
                    {selectedUser.points.toLocaleString()} points
                  </span>
                </div>
              </div>

              {/* Operation Selection */}
              <div className="flex gap-2">
                <Button
                  variant={pointsOperation === "add" ? "default" : "outline"}
                  onClick={() => setPointsOperation("add")}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Points
                </Button>
                <Button
                  variant={pointsOperation === "subtract" ? "destructive" : "outline"}
                  onClick={() => setPointsOperation("subtract")}
                  className="flex-1"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Subtract Points
                </Button>
              </div>

              {/* Points Input */}
              <div className="space-y-2">
                <Label htmlFor="points-amount">
                  Points to {pointsOperation === "add" ? "add" : "subtract"}
                </Label>
                <Input
                  id="points-amount"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={pointsChange}
                  onChange={(e) => setPointsChange(e.target.value)}
                />
                {pointsChange && parseInt(pointsChange) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    New balance will be:{" "}
                    <span className="font-semibold text-foreground">
                      {pointsOperation === "add"
                        ? (selectedUser.points + parseInt(pointsChange)).toLocaleString()
                        : Math.max(0, selectedUser.points - parseInt(pointsChange)).toLocaleString()}{" "}
                      points
                    </span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditPointsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateUserPoints}
                  disabled={!pointsChange || parseInt(pointsChange) <= 0 || updatingPoints}
                  className="flex-1"
                >
                  {updatingPoints ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>Confirm {pointsOperation === "add" ? "Add" : "Subtract"}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation for Mobile */}
      <AdminBottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        pendingOrders={stats.pendingOrders}
      />

      {/* Floating Action Button for Mobile */}
      <AdminFAB 
        pendingOrders={stats.pendingOrders}
        onNavigateToTab={setActiveTab}
      />
    </div>
  );
};

export default AdminDashboard;
