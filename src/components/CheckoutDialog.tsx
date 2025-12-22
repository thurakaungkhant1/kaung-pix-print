import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import InvoiceDialog from "./InvoiceDialog";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: number;
    name: string;
    price: number;
    image_url: string;
    points_value: number;
  };
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  userId: string;
  onSuccess: () => void;
}

const CheckoutDialog = ({
  open,
  onClose,
  cartItems,
  userId,
  onSuccess,
}: CheckoutDialogProps) => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderData, setOrderData] = useState<{
    orderId: string;
    orderDate: string;
  } | null>(null);
  const { toast } = useToast();

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  );
  const pointsToEarn = cartItems.reduce(
    (sum, item) => sum + item.products.points_value * item.quantity,
    0
  );

  const handleNext = () => {
    if (step === 1) {
      if (!phoneNumber || !deliveryAddress) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (step === 2 && paymentMethod !== "cod") {
      if (!paymentProof) {
        toast({
          title: "Payment Proof Required",
          description: "Please upload payment proof for mobile payment",
          variant: "destructive",
        });
        return;
      }
      if (!transactionId || transactionId.length !== 6 || !/^\d{6}$/.test(transactionId)) {
        toast({
          title: "Transaction ID Required",
          description: "Please enter the last 6 digits of your transaction ID",
          variant: "destructive",
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    let paymentProofPath = null;

    // Upload payment proof if mobile payment
    if (paymentMethod !== "cod" && paymentProof) {
      const fileExt = paymentProof.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, paymentProof);

      if (uploadError) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload payment proof",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Store only the file path, not a public URL
      // Signed URLs will be generated on-demand when admins view the order
      paymentProofPath = fileName;
    }

    // Create orders for all cart items
    const orderInserts = cartItems.map(item => ({
      user_id: userId,
      product_id: item.products.id,
      quantity: item.quantity,
      price: item.products.price * item.quantity,
      phone_number: phoneNumber,
      delivery_address: deliveryAddress,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofPath, // Store file path, not public URL
      transaction_id: paymentMethod !== "cod" ? transactionId : null,
      status: "pending",
    }));

    const { data: orderResults, error } = await supabase
      .from("orders")
      .insert(orderInserts)
      .select();

    setSubmitting(false);

    if (error || !orderResults || orderResults.length === 0) {
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
      return;
    }

    // Use the first order's data for the invoice display
    setOrderData({
      orderId: orderResults[0].id,
      orderDate: orderResults[0].created_at || new Date().toISOString(),
    });
    setShowInvoice(true);
  };

  const resetForm = () => {
    setStep(1);
    setPhoneNumber("");
    setDeliveryAddress("");
    setPaymentMethod("cod");
    setPaymentProof(null);
    setTransactionId("");
    setOrderData(null);
  };

  const handleInvoiceClose = () => {
    setShowInvoice(false);
    onSuccess();
    onClose();
    resetForm();
  };

  return (
    <>
      <Dialog open={open && !showInvoice} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout - Step {step} of 3</DialogTitle>
          <DialogDescription>
            Complete your purchase to earn {pointsToEarn} points
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Order Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-sm">Order Items ({cartItems.length})</h4>
              {cartItems.map((item, index) => (
                <div key={index} className={`flex gap-3 ${index > 0 ? "pt-3 border-t" : ""}`}>
                  <img
                    src={item.products.image_url}
                    alt={item.products.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.products.name}</h3>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="text-primary font-bold text-sm">
                      {(item.products.price * item.quantity).toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">{totalPrice.toLocaleString()} MMK</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09xxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter your complete delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                required
              />
            </div>

            <Button onClick={handleNext} className="w-full">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Select Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex-1 cursor-pointer">
                    Cash on Delivery (COD)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="kpay" id="kpay" />
                  <Label htmlFor="kpay" className="flex-1 cursor-pointer">
                    KPay
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="wavepay" id="wavepay" />
                  <Label htmlFor="wavepay" className="flex-1 cursor-pointer">
                    Wave Pay
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded">
                  <RadioGroupItem value="cbpay" id="cbpay" />
                  <Label htmlFor="cbpay" className="flex-1 cursor-pointer">
                    CB Pay
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod !== "cod" && (
              <div className="space-y-2">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold">Payment Information</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please transfer {totalPrice.toLocaleString()} MMK to our {paymentMethod.toUpperCase()} account
                  </p>
                  <p className="text-sm font-mono mt-2">Account: 09XXXXXXXXX</p>
                </div>

                <div>
                  <Label htmlFor="proof">Upload Payment Proof *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="proof"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {paymentProof && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  {paymentProof && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {paymentProof.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="transactionId">Last 6 Digits of Transaction ID *</Label>
                  <Input
                    id="transactionId"
                    type="text"
                    placeholder="123456"
                    value={transactionId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTransactionId(value);
                    }}
                    maxLength={6}
                    className="font-mono text-lg tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter exactly 6 digits from your payment transaction
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-semibold">Order Summary</h3>
              
              <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div key={index} className={`${index > 0 ? "pt-2 border-t" : ""}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">{item.products.name}</span>
                      <span className="text-muted-foreground">×{item.quantity}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{item.products.price.toLocaleString()} MMK each</span>
                      <span className="font-semibold text-foreground">
                        {(item.products.price * item.quantity).toLocaleString()} MMK
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{cartItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grand Total:</span>
                  <span className="font-bold text-primary">{totalPrice.toLocaleString()} MMK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points to Earn:</span>
                  <span className="font-bold text-green-600">{pointsToEarn}</span>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-medium capitalize">{paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod.toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Delivery Address:</strong><br />
                  {deliveryAddress}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleBack} variant="outline" className="flex-1" disabled={submitting}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
                {submitting ? "Placing Order..." : "Confirm Order"}
              </Button>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      {orderData && (
        <InvoiceDialog
          open={showInvoice}
          onClose={handleInvoiceClose}
          orderId={orderData.orderId}
          orderDate={orderData.orderDate}
          items={cartItems.map(item => ({
            product: item.products,
            quantity: item.quantity,
          }))}
          phoneNumber={phoneNumber}
          deliveryAddress={deliveryAddress}
          paymentMethod={paymentMethod}
          totalPrice={totalPrice}
          pointsEarned={pointsToEarn}
        />
      )}
    </>
  );
};

export default CheckoutDialog;
