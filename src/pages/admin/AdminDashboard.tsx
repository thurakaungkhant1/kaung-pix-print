import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  products?: { name: string };
  profiles?: { name: string };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    photos: 0,
    orders: 0,
    users: 0,
    revenue: 0,
    pendingOrders: 0,
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
      loadOrders();
    }
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
    const [products, photos, orders, profiles, revenueData, pendingData] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("price").eq("status", "approved"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const totalRevenue = revenueData.data?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      products: products.count || 0,
      photos: photos.count || 0,
      orders: orders.count || 0,
      users: profiles.count || 0,
      revenue: totalRevenue,
      pendingOrders: pendingData.count || 0,
    });
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setUsers(data);
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, products(name)`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setOrders(data as Order[]);
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
                  { label: "Revenue", value: `${stats.revenue.toLocaleString()} MMK`, icon: TrendingUp, color: "text-primary" },
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
                        <Badge variant={order.status === "approved" ? "default" : order.status === "pending" ? "secondary" : "destructive"}>
                          {order.status}
                        </Badge>
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
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                          <TableCell>{order.products?.name || "Product"}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>{Number(order.price).toLocaleString()} MMK</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
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
                            <Select
                              value={order.status}
                              onValueChange={(value) => updateOrderStatus(order.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
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
