import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Image, ShoppingCart, Users, Plus, ArrowLeft, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    photos: 0,
    orders: 0,
    users: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadStats();
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
    } else {
      setIsAdmin(true);
    }
  };

  const loadStats = async () => {
    const [products, photos, orders, profiles] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      products: products.count || 0,
      photos: photos.count || 0,
      orders: orders.count || 0,
      users: profiles.count || 0,
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.photos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Button onClick={() => navigate("/admin/products/new")} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/products")} className="w-full">
              Manage Products
            </Button>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Button onClick={() => navigate("/admin/photos/new")} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Upload Client Photos
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/photos")} className="w-full">
              Manage Photos
            </Button>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Button variant="outline" onClick={() => navigate("/admin/orders")} className="w-full">
              View All Orders
            </Button>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Button variant="outline" onClick={() => navigate("/admin/users")} className="w-full">
              View All Users
            </Button>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/admin/withdrawal-settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Withdrawal Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
