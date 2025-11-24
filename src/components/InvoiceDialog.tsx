import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  points_value: number;
}

interface InvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderDate: string;
  product: Product;
  quantity: number;
  phoneNumber: string;
  deliveryAddress: string;
  paymentMethod: string;
  totalPrice: number;
  pointsEarned: number;
}

const InvoiceDialog = ({
  open,
  onClose,
  orderId,
  orderDate,
  product,
  quantity,
  phoneNumber,
  deliveryAddress,
  paymentMethod,
  totalPrice,
  pointsEarned,
}: InvoiceDialogProps) => {
  const formatPaymentMethod = (method: string) => {
    if (method === "cod") return "Cash on Delivery";
    return method.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Order Invoice</DialogTitle>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Header */}
          <div className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mb-3" />
            <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
              Order Placed Successfully!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Thank you for your purchase
            </p>
          </div>

          {/* Order Information */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-mono font-semibold">#{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Date:</span>
              <span className="font-medium">{format(new Date(orderDate), "PPP p")}</span>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Customer Information</h4>
            <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{phoneNumber}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-1">Delivery Address:</p>
                <p className="font-medium">{deliveryAddress}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Order Details</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex gap-3 p-4 bg-muted/30">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Ks {product.price.toFixed(2)} × {quantity}
                    </span>
                    <span className="font-bold">
                      Ks {(product.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Total */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium">{formatPaymentMethod(paymentMethod)}</span>
            </div>
            
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Grand Total:</span>
                <span className="text-xl font-bold text-primary">
                  Ks {totalPrice.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <span className="text-sm text-muted-foreground">Points Earned:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  +{pointsEarned} pts
                </span>
              </div>
            </div>
          </div>

          {/* Order Status Notice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Your order is being processed. 
              {paymentMethod === "cod" 
                ? " Our team will contact you shortly to confirm delivery."
                : " Please wait for admin approval after payment verification."}
            </p>
          </div>

          {/* Close Button */}
          <Button onClick={onClose} className="w-full" size="lg">
            Close Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
