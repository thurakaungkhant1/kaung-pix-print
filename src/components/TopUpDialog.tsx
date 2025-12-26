import { useState } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TopUpDialog = ({ open, onOpenChange, onSuccess }: TopUpDialogProps) => {
  const { user } = useAuth();
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
      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Get the URL
      const { data: urlData } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(fileName);

      // Create deposit request
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
      
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }, 2000);

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

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-neon flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Top Up / ငွေသွင်းမည်
          </DialogTitle>
          <DialogDescription>
            Upload your payment screenshot and enter the amount to top up your wallet.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground">
              Your deposit is pending approval. You'll be notified once it's approved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount (Ks)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/50"
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
            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={previewUrl} 
                      alt="Payment screenshot" 
                      className="max-h-48 mx-auto rounded-lg"
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
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload screenshot
                    </p>
                    <p className="text-xs text-muted-foreground">
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
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Payment Instructions</p>
                  <p className="text-muted-foreground mt-1">
                    Transfer to: KPay/Wave Pay<br/>
                    Phone: 09-XXX-XXX-XXX<br/>
                    Include your username in the note.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !amount || !screenshot}
              className="w-full btn-neon"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Deposit Request'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDialog;
