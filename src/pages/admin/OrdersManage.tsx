import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  profiles: { name: string; phone_number: string };
  products: { name: string; image_url: string; points_value: number };
}

// Track which orders are currently loading signed URLs
type LoadingState = { [orderId: string]: boolean };

const OrdersManage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProofs, setLoadingProofs] = useState<LoadingState>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate a signed URL for viewing payment proof
  const viewPaymentProof = async (orderId: string, filePath: string) => {
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

      // Open the signed URL in a new tab
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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
        products:product_id(name, image_url, points_value)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "finished":
        return "bg-green-500";
      case "approved":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Orders</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
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
                  
                  <div className="space-y-1 text-sm">
                    <p><strong>Phone:</strong> {order.phone_number}</p>
                    <p><strong>Address:</strong> {order.delivery_address}</p>
                    <p><strong>Payment:</strong> {order.payment_method.toUpperCase()}</p>
                    {order.payment_proof_url && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        onClick={() => viewPaymentProof(order.id, order.payment_proof_url!)}
                        disabled={loadingProofs[order.id]}
                      >
                        {loadingProofs[order.id] ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Payment Proof
                          </>
                        )}
                      </Button>
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
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
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
    </div>
  );
};

export default OrdersManage;
