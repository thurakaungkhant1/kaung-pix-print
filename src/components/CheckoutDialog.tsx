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

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  points_value: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  quantity: number;
  userId: string;
  onSuccess: () => void;
}

const CheckoutDialog = ({
  open,
  onClose,
  product,
  quantity,
  userId,
  onSuccess,
}: CheckoutDialogProps) => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const totalPrice = product.price * quantity;
  const pointsToEarn = product.points_value * quantity;

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
    
    if (step === 2 && paymentMethod !== "cod" && !paymentProof) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload payment proof for mobile payment",
        variant: "destructive",
      });
      return;
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

    let paymentProofUrl = null;

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

      const { data: urlData } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      paymentProofUrl = urlData.publicUrl;
    }

    // Create order
    const { error } = await supabase.from("orders").insert({
      user_id: userId,
      product_id: product.id,
      quantity,
      price: totalPrice,
      phone_number: phoneNumber,
      delivery_address: deliveryAddress,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Order Placed Successfully!",
      description: `Your order is being processed. You'll earn ${pointsToEarn} points when your order is completed!`,
    });

    onSuccess();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setPhoneNumber("");
    setDeliveryAddress("");
    setPaymentMethod("cod");
    setPaymentProof(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
                <p className="text-primary font-bold">${totalPrice.toFixed(2)}</p>
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
                    Please transfer ${totalPrice.toFixed(2)} to our {paymentMethod.toUpperCase()} account
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
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span className="font-bold text-primary">${totalPrice.toFixed(2)}</span>
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
  );
};

export default CheckoutDialog;
