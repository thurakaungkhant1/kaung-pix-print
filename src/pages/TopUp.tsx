import { useState } from "react";
import { ArrowLeft, Upload, Loader2, CheckCircle, AlertCircle, Wallet, CreditCard, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount || !screenshot) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('wallet_deposits')
        .insert({
          user_id: user.id,
          amount: amountNum,
          screenshot_url: fileName,
        });

      if (insertError) throw insertError;

      setIsSuccess(true);
      toast.success("Deposit request submitted! Awaiting admin approval.");

    } catch (error: any) {
      console.error('Error submitting deposit:', error);
      toast.error(error.message || "Failed to submit deposit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setScreenshot(null);
    setPreviewUrl(null);
    setIsSuccess(false);
  };

  const presetAmounts = [5000, 10000, 20000, 50000, 100000];

  const paymentMethods = [
    { name: "KBZ Pay", phone: "09694577177", icon: Phone },
    { name: "Wave Pay", phone: "09694577177", icon: CreditCard },
    { name: "CB Pay", phone: "0211600900000647", icon: Wallet },
  ];

  if (!user) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">Please login to top up your wallet.</p>
              <Button onClick={() => navigate('/auth/login')} className="w-full">
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/10 py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Top Up Wallet</h1>
              <p className="text-sm text-muted-foreground">Add funds to your account</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {isSuccess ? (
            <Card className="border-green-500/30">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Request Submitted!</h3>
                <p className="text-muted-foreground mb-6">
                  Your deposit is pending approval. You'll be notified once it's approved.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    New Deposit
                  </Button>
                  <Button onClick={() => navigate('/wallet-history')} className="flex-1">
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Payment Methods */}
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">Payment Methods</h2>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card key={method.name} className="border-border/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <method.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.phone}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-medium text-primary">How to deposit:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Transfer to one of the payment methods above</li>
                        <li>Include your username in the transfer note</li>
                        <li>Take a screenshot of the transaction</li>
                        <li>Upload the screenshot below</li>
                        <li>Wait for admin approval (usually within 24 hours)</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Amount (Ks)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-lg bg-card"
                />
                
                {/* Preset Amounts */}
                <div className="flex flex-wrap gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                      className={amount === preset.toString() ? 'border-primary bg-primary/20' : ''}
                    >
                      {preset.toLocaleString()} Ks
                    </Button>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Payment Screenshot</Label>
                <Card className="border-dashed border-2 border-border/50">
                  <CardContent className="p-6 text-center">
                    {previewUrl ? (
                      <div className="space-y-3">
                        <img 
                          src={previewUrl} 
                          alt="Payment screenshot" 
                          className="max-h-64 mx-auto rounded-lg shadow-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScreenshot(null);
                            setPreviewUrl(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="font-medium text-foreground mb-1">
                          Click to upload screenshot
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !amount || !screenshot}
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Submit Deposit Request
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default TopUp;
