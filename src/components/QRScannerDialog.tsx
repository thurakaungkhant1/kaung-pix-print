import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the decoded text. Return true to close, false to keep scanning. */
  onResult: (text: string) => boolean | void;
}

const QRScannerDialog = ({ open, onOpenChange, onResult }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      setError(null);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    setStarting(true);
    const s = new QrScanner(
      v,
      (res) => {
        const close = onResult(res.data);
        if (close !== false) {
          s.stop();
          onOpenChange(false);
        }
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true }
    );
    scannerRef.current = s;
    s.start()
      .catch((e) => setError(e?.message ?? "Couldn't start camera"))
      .finally(() => setStarting(false));
    return () => {
      s.stop();
      s.destroy();
    };
  }, [open, onOpenChange, onResult]);

  const pickFile = () => fileRef.current?.click();
  const onFile = async (f: File | null) => {
    if (!f) return;
    try {
      const res = await QrScanner.scanImage(f, { returnDetailedScanResult: true });
      const close = onResult(res.data);
      if (close !== false) onOpenChange(false);
    } catch {
      toast.error("No QR code found in image");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby="qr-scan-desc">
        <DialogHeader>
          <DialogTitle>Scan a gift QR code</DialogTitle>
          <DialogDescription id="qr-scan-desc">
            Point your camera at a gift QR code to open it.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            aria-label="Camera viewfinder for QR scanning"
            muted
            playsInline
          />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white/90 bg-black/70">
              <Camera className="w-6 h-6 mb-2" />
              <p className="text-sm">{error}</p>
              <p className="text-xs text-white/60 mt-1">You can still upload an image below.</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={pickFile} aria-label="Upload an image with a QR code">
            <ImageIcon className="w-4 h-4 mr-2" /> Upload image
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close QR scanner">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerDialog;
