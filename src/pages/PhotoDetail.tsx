import { useEffect, useState } from "react";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Download, ArrowLeft, FileArchive, Calendar, Share2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addWatermark } from "@/lib/watermarkUtils";
import ImageViewer from "@/components/ImageViewer";
import { motion } from "framer-motion";

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  shooting_date: string | null;
}

const PhotoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
      setPhoto(data);
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
    if (!user) {
      toast({ title: "Login required", description: "Please login to add favourites", variant: "destructive" });
      return;
    }
    const photoId = parseInt(id!);
    if (isFavourite) {
      await supabase.from("favourite_photos").delete().eq("user_id", user.id).eq("photo_id", photoId);
    } else {
      await supabase.from("favourite_photos").insert({ user_id: user.id, photo_id: photoId });
    }
    setIsFavourite(!isFavourite);
  };

  const handleDownload = () => {
    if (!photo?.file_url) return;
    window.open(photo.file_url, '_blank');
    toast({ title: "Download started", description: "Your download will begin in your browser" });
  };

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
          className="relative w-full aspect-[3/4] max-h-[70vh] bg-muted overflow-hidden cursor-zoom-in"
          onClick={() => imageSrc && setImageViewerOpen(true)}
        >
          {imageSrc ? (
            <>
              {/* Blurred background fill */}
              <img
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
              />
              {/* Main image */}
              <motion.img
                src={imageSrc}
                alt={photo.client_name}
                className="relative w-full h-full object-contain z-10"
                initial={{ scale: 1.05 }}
                animate={{ scale: imageLoaded ? 1 : 1.05 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onLoad={() => setImageLoaded(true)}
              />
              {/* Zoom hint */}
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
          {/* Bottom gradient overlay */}
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
            {/* Title Section */}
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
                      year: "numeric",
                      month: "long",
                      day: "numeric",
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
                    Your high-resolution photos are packaged and ready for download. Tap the button below to get started.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Download Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="pb-8"
            >
              <Button
                className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-5 w-5" />
                Download Photos
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Image Viewer */}
        <ImageViewer
          src={imageSrc || ""}
          alt={photo.client_name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    </AnimatedPage>
  );
};

export default PhotoDetail;
