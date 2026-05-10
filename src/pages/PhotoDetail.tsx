import { useEffect, useState } from "react";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Download, ArrowLeft, FileArchive, Calendar, Share2, Eye, ShieldAlert, Lock, KeyRound, Phone, Image as ImageIcon, X } from "lucide-react";
import { useMusic } from "@/contexts/MusicContext";
import MusicPlayer from "@/components/MusicPlayer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addWatermark } from "@/lib/watermarkUtils";
import ImageViewer from "@/components/ImageViewer";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import JSZip from "jszip";

interface ZipPhoto {
  name: string;
  blob: Blob;
  url: string;
}

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  shooting_date: string | null;
  download_pin: string | null;
}

const PhotoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showForgetPin, setShowForgetPin] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState<"idle" | "fetching" | "extracting">("idle");
  const [zipPhotos, setZipPhotos] = useState<ZipPhoto[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<ZipPhoto | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentSrc: musicSrc } = useMusic();

  useEffect(() => {
    loadPhoto();
    if (user) {
      checkFavourite();
    }
  }, [id, user]);

  const loadPhoto = async () => {
    const photoId = parseInt(id!);
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("id", photoId)
      .single();

    if (!error && data) {
      setPhoto(data as Photo);
      if (data.preview_image) {
        try {
          const watermarked = await addWatermark(data.preview_image);
          setWatermarkedImage(watermarked);
        } catch (error) {
          console.error("Failed to add watermark:", error);
          setWatermarkedImage(data.preview_image);
        }
      }
    }
  };

  const checkFavourite = async () => {
    if (!user || !id) return;
    const photoId = parseInt(id);
    const { data } = await supabase
      .from("favourite_photos")
      .select("id")
      .eq("user_id", user.id)
      .eq("photo_id", photoId)
      .maybeSingle();
    setIsFavourite(!!data);
  };

  const toggleFavourite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: "Login required", description: "Please login to add favourites", variant: "destructive" });
      navigate(`/auth/login?redirectTo=${encodeURIComponent(`/photo/${id}`)}`);
      return;
    }
    const photoId = parseInt(id!);
    if (isFavourite) {
      await supabase.from("favourite_photos").delete().eq("user_id", session.user.id).eq("photo_id", photoId);
    } else {
      await supabase.from("favourite_photos").insert({ user_id: session.user.id, photo_id: photoId });
    }
    setIsFavourite(!isFavourite);
  };

  const handleDownloadClick = async () => {
    if (!photo) return;
    // Enforce authentication before any download flow
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "Login required",
        description: "Photo download လုပ်ရန် login ဝင်ရန် လိုအပ်ပါသည်။",
        variant: "destructive",
      });
      navigate(`/auth/login?redirectTo=${encodeURIComponent(`/photo/${photo.id}`)}`);
      return;
    }
    setConfirmOpen(true);
  };

  const proceedAfterConfirm = () => {
    setConfirmOpen(false);
    if (!photo) return;
    if (photo.download_pin) {
      setPinValue("");
      setPinError(false);
      setShowForgetPin(false);
      setPinDialogOpen(true);
    } else {
      performDownload();
    }
  };

  const handlePinSubmit = () => {
    if (!photo?.download_pin) return;
    if (pinValue === photo.download_pin) {
      setPinDialogOpen(false);
      performDownload();
      toast({ title: "✅ PIN Correct", description: "Download starting..." });
    } else {
      setPinError(true);
      setPinValue("");
      setShowForgetPin(true);
    }
  };

  const performDownload = async () => {
    if (!photo?.file_url) return;
    // Re-verify session right before fetching the file
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: "Session expired", description: "Please login again.", variant: "destructive" });
      navigate(`/auth/login?redirectTo=${encodeURIComponent(`/photo/${photo.id}`)}`);
      return;
    }
    setDownloading(true);
    setDownloadStage("fetching");
    setDownloadProgress(0);
    try {
      const response = await fetch(photo.file_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get("content-length")) || photo.file_size || 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream not supported");
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0) setDownloadProgress(Math.min(95, Math.round((received / total) * 95)));
        }
      }
      const blob = new Blob(chunks as BlobPart[]);

      // Try to extract the ZIP and present a picker
      setDownloadStage("extracting");
      setDownloadProgress(97);
      try {
        const zip = await JSZip.loadAsync(blob);
        const entries: ZipPhoto[] = [];
        const fileNames = Object.keys(zip.files).filter((n) => {
          const f = zip.files[n];
          if (f.dir) return false;
          return /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(n);
        });
        for (const name of fileNames) {
          const fileBlob = await zip.files[name].async("blob");
          const ext = name.split(".").pop()?.toLowerCase() || "jpg";
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          const typed = new Blob([fileBlob], { type: mime });
          entries.push({ name: name.split("/").pop() || name, blob: typed, url: URL.createObjectURL(typed) });
        }

        if (entries.length === 0) {
          // Not images inside; fall back to direct ZIP download
          downloadBlob(blob, `${photo.client_name || "photo"}.zip`);
          toast({ title: "✅ Download complete", description: "ZIP file saved to your device." });
        } else {
          setZipPhotos(entries);
          setPickerOpen(true);
          toast({ title: "✅ Photos ready", description: `${entries.length} photos available — pick one to download.` });
        }
      } catch (zipErr) {
        // Not a zip, save raw file
        const ext = photo.file_url.split("?")[0].split(".").pop() || "jpg";
        downloadBlob(blob, `${photo.client_name || "photo"}.${ext}`);
        toast({ title: "✅ Download complete", description: "File saved to your device." });
      }
      setDownloadProgress(100);
    } catch (err: any) {
      console.error(err);
      const width = 900, height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(photo.file_url, "download_popup", `width=${width},height=${height},left=${left},top=${top}`);
      toast({
        title: "Direct download unavailable",
        description: "Opened in a new window. VPN လိုအပ်ပါက ချိတ်ဆက်ပြီး ထပ်ကြိုးစားပါ။",
        duration: 6000,
      });
    } finally {
      setTimeout(() => { setDownloading(false); setDownloadProgress(0); setDownloadStage("idle"); }, 800);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadSingle = (zp: ZipPhoto) => {
    downloadBlob(zp.blob, zp.name);
    toast({ title: "✅ Photo saved", description: zp.name });
  };

  const downloadAllZip = () => {
    // Re-zip selected? Just refetch original ZIP and save it
    if (!photo?.file_url) return;
    fetch(photo.file_url).then((r) => r.blob()).then((b) => {
      downloadBlob(b, `${photo.client_name || "photos"}.zip`);
      toast({ title: "✅ Full ZIP saved" });
    });
  };

  // Cleanup object URLs when picker closes
  useEffect(() => {
    if (!pickerOpen && zipPhotos.length > 0) {
      const t = setTimeout(() => {
        zipPhotos.forEach((p) => URL.revokeObjectURL(p.url));
        setZipPhotos([]);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [pickerOpen]);

  const handleShare = () => {
    if (!photo) return;
    const shareUrl = `${window.location.origin}/photo/${photo.id}`;
    if (navigator.share) {
      navigator.share({ title: photo.client_name, text: "Check out this photo on Kaung Computer!", url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Photo link copied to clipboard" });
    }
  };

  const handleForgetPin = () => {
    setPinDialogOpen(false);
    navigate("/contact");
  };

  if (!photo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading photo...</p>
        </motion.div>
      </div>
    );
  }

  const imageSrc = watermarkedImage || photo.preview_image;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-background">
        {/* Floating Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
        >
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-sm flex items-center justify-center hover:bg-background transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <Share2 className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={toggleFavourite}
                className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <Heart className={`h-4 w-4 transition-colors ${isFavourite ? "fill-destructive text-destructive" : "text-foreground"}`} />
              </button>
            </div>
          </div>
        </motion.header>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full aspect-square sm:aspect-[3/4] max-h-[60vh] sm:max-h-[70vh] bg-muted overflow-hidden cursor-zoom-in"
          onClick={() => imageSrc && setImageViewerOpen(true)}
        >
          {imageSrc ? (
            <>
              <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
              <motion.img
                src={imageSrc}
                alt={photo.client_name}
                className="relative w-full h-full object-contain z-10"
                initial={{ scale: 1.05 }}
                animate={{ scale: imageLoaded ? 1 : 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onLoad={() => setImageLoaded(true)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-foreground/60 backdrop-blur-md px-3 py-1.5 rounded-full"
              >
                <Eye className="h-3 w-3 text-background" />
                <span className="text-background text-[11px] font-medium">Tap to zoom</span>
              </motion.div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileArchive className="h-24 w-24 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
        </motion.div>

        {/* Content */}
        <div className="relative z-20 -mt-8 max-w-screen-xl mx-auto">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="px-5"
          >
            <div className="space-y-3 mb-6">
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight leading-tight">
                {photo.client_name}
              </h1>
              {photo.shooting_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(photo.shooting_date).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Info Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="rounded-2xl bg-card border border-border/50 p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileArchive className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">ZIP Archive Ready</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your high-resolution photos are packaged and ready for download.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* PIN Notice */}
            {photo.download_pin && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className="rounded-2xl bg-primary/5 border border-primary/20 p-4 mb-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">PIN Code Required</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ဤ photo ကို download လုပ်ရန် 6 digit PIN code လိုအပ်ပါသည်။
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VPN Notice */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="rounded-2xl bg-accent/10 border border-accent/20 p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4 text-accent" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">VPN လိုအပ်နိုင်ပါသည်</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Download link မဖွင့်နိုင်ပါက VPN ချိတ်ဆက်ပြီး ထပ်မံကြိုးစားပါ။
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Download Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="pb-8"
            >
              <Button
                className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
                onClick={handleDownloadClick}
              >
                {photo.download_pin ? (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Enter PIN & Download
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Download Photos
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* PIN Dialog */}
        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader className="text-center items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-lg">Enter Download PIN</DialogTitle>
              <DialogDescription>
                6 digit PIN code ထည့်သွင်းပါ
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <InputOTP
                maxLength={6}
                value={pinValue}
                onChange={(value) => {
                  setPinValue(value);
                  setPinError(false);
                }}
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

              <AnimatePresence>
                {pinError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-destructive font-medium"
                  >
                    ❌ PIN code မှားနေပါသည်
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                className="w-full h-12 rounded-xl font-semibold"
                onClick={handlePinSubmit}
                disabled={pinValue.length !== 6}
              >
                <Download className="mr-2 h-4 w-4" />
                Verify & Download
              </Button>

              {showForgetPin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl text-sm"
                    onClick={handleForgetPin}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Forget PIN? Contact Admin
                  </Button>
                </motion.div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm download dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ZIP Download စတင်မလား?</AlertDialogTitle>
              <AlertDialogDescription>
                {photo?.client_name} • {photo?.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(2)} MB` : "ZIP archive"}
                {photo?.download_pin && " • PIN code လိုအပ်ပါမည်"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={proceedAfterConfirm}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Download progress overlay */}
        <AnimatePresence>
          {downloading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {downloadStage === "extracting" ? "Extracting photos…" : "Downloading…"}
                    </p>
                    <p className="text-xs text-muted-foreground">{downloadProgress}% complete</p>
                  </div>
                </div>
                <Progress value={downloadProgress} className="h-2" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo Picker Dialog */}
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-5 pt-5 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Select a photo to download
              </DialogTitle>
              <DialogDescription>
                {zipPhotos.length} photos ပါဝင်ပါသည်။ ကြိုက်နှစ်သက်သော photo တစ်ပုံကို နှိပ်ပြီး download လုပ်နိုင်ပါသည်။
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {zipPhotos.map((zp, idx) => (
                  <motion.div
                    key={zp.name + idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="group relative rounded-xl overflow-hidden bg-muted border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(zp)}
                      className="block w-full aspect-square overflow-hidden"
                    >
                      <img
                        src={zp.url}
                        alt={zp.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between gap-2">
                      <p className="text-[10px] text-white/90 truncate flex-1" title={zp.name}>{zp.name}</p>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); downloadSingle(zp); }}
                        aria-label="Download this photo"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="border-t p-4 flex items-center justify-between gap-2 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Tap any photo to preview, or use the download icon to save.
              </p>
              <Button variant="outline" size="sm" onClick={downloadAllZip}>
                <FileArchive className="h-4 w-4 mr-2" />
                Download All (ZIP)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Single photo preview from picker */}
        <Dialog open={!!previewPhoto} onOpenChange={(o) => !o && setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            {previewPhoto && (
              <div className="flex flex-col">
                <div className="relative bg-black flex items-center justify-center max-h-[70vh]">
                  <img src={previewPhoto.url} alt={previewPhoto.name} className="max-w-full max-h-[70vh] object-contain" />
                  <button
                    onClick={() => setPreviewPhoto(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium truncate">{previewPhoto.name}</p>
                  <Button onClick={() => downloadSingle(previewPhoto)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Viewer */}
        <ImageViewer
          src={imageSrc || ""}
          alt={photo.client_name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
        {/* Music Player - continues from Photo gallery */}
        {musicSrc && (
          <MusicPlayer audioSrc={musicSrc} className="bottom-4 right-4" />
        )}
      </div>
    </AnimatedPage>
  );
};

export default PhotoDetail;
