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
  Calendar,
  Bell,
  Volume2,
  VolumeX,
  Phone,
  MapPin,
  Mail,
  User,
  Gamepad2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('admin-sound-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
      loadOrders();
      loadRevenueData();
      loadOrderStatusData();
      loadUserGrowthData();
    }
  }, [isAdmin]);

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
          loadStats();
          loadOrderStatusData();
          loadRevenueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

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
    } else {
      setIsAdmin(true);
    }
  };

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

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setUsers(data);
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
      loadStats();
    }
  };

  const deleteUser = async (userId: string) => {
    // Note: This would need proper auth admin setup
    toast({ title: "Info", description: "User deletion requires backend admin setup" });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) return null;

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "products", label: "Products", icon: Package },
    { id: "photos", label: "Photos", icon: Image },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border",
          "transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                "transition-all duration-200",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
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
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
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

              {(activeTab === "users" || activeTab === "orders") && (
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
                      <Calendar className="h-5 w-5 text-green-500" />
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

          {/* Orders Tab */}
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
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
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
                            <TableCell>{order.products?.name || "Product"}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
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
                            <div>
                              <p className="text-sm text-muted-foreground">Phone Number</p>
                              <p className="font-medium">{selectedOrder.phone_number || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm text-muted-foreground">Delivery Address</p>
                              <p className="font-medium">{selectedOrder.delivery_address || "-"}</p>
                            </div>
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
                          <h4 className="font-semibold">Payment Proof</h4>
                          <a
                            href={selectedOrder.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            View Payment Screenshot
                          </a>
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
    </div>
  );
};

export default AdminDashboard;
