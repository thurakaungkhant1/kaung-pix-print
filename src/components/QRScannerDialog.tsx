import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Image as ImageIcon, X, ShieldAlert, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { track, GiftEvents } from "@/lib/analytics";

export type ScanResultOutcome =
  | true
  | false
  | void
  | { ok: false; message: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /**
   * Called with the decoded text. Return:
   *  - true (or void): valid — close the dialog
   *  - false: keep scanning, no inline error
   *  - { ok:false, message }: keep scanning and show inline aria-live error
   */
  onResult: (text: string) => ScanResultOutcome;
}

type DialogState = "starting" | "scanning" | "denied" | "error";

const isPermissionDenied = (err: unknown) => {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name?.toLowerCase() ?? "";
  const msg = e?.message?.toLowerCase() ?? "";
  return (
    name.includes("notallowed") ||
    name.includes("permissiondenied") ||
    name.includes("security") ||
    msg.includes("permission") ||
    msg.includes("denied")
  );
};

const QRScannerDialog = ({ open, onOpenChange, onResult }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<DialogState>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Capture focus owner before the dialog opens so we can restore on close.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      setErrorMessage(null);
      setInlineError(null);
      setState("starting");
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    setState("starting");
    const s = new QrScanner(
      v,
      (res) => {
        const outcome = onResult(res.data);
        if (outcome === false) return;
        if (outcome && typeof outcome === "object" && outcome.ok === false) {
          setInlineError(outcome.message);
          return;
        }
        // success
        setInlineError(null);
        s.stop();
        onOpenChange(false);
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true }
    );
    scannerRef.current = s;
    s.start()
      .then(() => setState("scanning"))
      .catch((e) => {
        if (isPermissionDenied(e)) {
          setState("denied");
          track(GiftEvents.CameraDenied, { source: "qr_scanner" });
        } else {
          setErrorMessage(e?.message ?? "Couldn't start camera");
          setState("error");
        }
      });
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
      const outcome = onResult(res.data);
      if (outcome === false) return;
      if (outcome && typeof outcome === "object" && outcome.ok === false) {
        setInlineError(outcome.message);
        return;
      }
      setInlineError(null);
      onOpenChange(false);
    } catch {
      track(GiftEvents.QrDecodeFailed, { source: "image_upload" });
      setInlineError("No QR code found in that image. Try another photo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        aria-describedby="qr-scan-desc"
        onCloseAutoFocus={(e) => {
          // Restore focus to the element that opened the dialog so keyboard
          // users land back on the button they triggered.
          if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
            e.preventDefault();
            previousFocusRef.current.focus();
          }
        }}
      >
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
          {state === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Loader2 className="w-6 h-6 animate-spin" aria-label="Starting camera" />
            </div>
          )}
          {state === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 text-white bg-black/85">
              <ShieldAlert className="w-7 h-7 mb-2 text-amber-400" aria-hidden="true" />
              <p className="text-sm font-medium">Camera access is blocked</p>
              <p className="text-xs text-white/70 mt-1 mb-3">
                Allow camera permission, then reopen this scanner.
              </p>
              <ul className="text-[11px] text-white/80 text-left space-y-1 max-w-[16rem]">
                <li>
                  <strong>iPhone:</strong> Settings → Safari → Camera → Allow.
                </li>
                <li>
                  <strong>Android:</strong> Tap the lock icon in the address bar → Permissions → Camera.
                </li>
                <li>
                  <strong>Desktop:</strong> Click the camera icon in the address bar and choose Allow.
                </li>
              </ul>
            </div>
          )}
          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white/90 bg-black/70">
              <Camera className="w-6 h-6 mb-2" aria-hidden="true" />
              <p className="text-sm">{errorMessage}</p>
              <p className="text-xs text-white/60 mt-1">You can still upload an image below.</p>
            </div>
          )}
        </div>

        {/* Inline, screen-reader friendly error for decode/validation failures */}
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className={
            inlineError
              ? "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs px-3 py-2"
              : "sr-only"
          }
        >
          {inlineError && (
            <>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{inlineError}</span>
            </>
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
