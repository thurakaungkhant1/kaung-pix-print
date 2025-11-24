import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PinVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  storedPin: string | null;
}

const PinVerificationDialog = ({ open, onOpenChange, onVerified, storedPin }: PinVerificationDialogProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (pin.length !== 6) {
      setError("Please enter a 6-digit PIN");
      return;
    }

    if (!storedPin) {
      setError("No PIN set. Please set up your PIN in Account settings first.");
      return;
    }

    setIsVerifying(true);
    setError("");

    // Verify PIN
    if (pin === storedPin) {
      onVerified();
      onOpenChange(false);
      setPin("");
      setError("");
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }

    setIsVerifying(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPin("");
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            PIN Verification Required
          </DialogTitle>
          <DialogDescription>
            Enter your 6-digit PIN to download this photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!storedPin && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You haven't set up a download PIN yet. Please go to your Account page to set one up first.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={6}
              value={pin}
              onChange={(value) => {
                setPin(value);
                setError("");
              }}
              disabled={!storedPin}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={pin.length !== 6 || isVerifying || !storedPin}
            >
              {isVerifying ? "Verifying..." : "Verify & Download"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinVerificationDialog;
