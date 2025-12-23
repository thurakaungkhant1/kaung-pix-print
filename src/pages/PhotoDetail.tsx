import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Download, ArrowLeft, FileArchive, Calendar, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addWatermark } from "@/lib/watermarkUtils";
import ImageViewer from "@/components/ImageViewer";

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
      
      // Apply watermark to preview image
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
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    const photoId = parseInt(id!);
    if (isFavourite) {
      await supabase
        .from("favourite_photos")
        .delete()
        .eq("user_id", user.id)
        .eq("photo_id", photoId);
    } else {
      await supabase
        .from("favourite_photos")
        .insert({ user_id: user.id, photo_id: photoId });
    }

    setIsFavourite(!isFavourite);
  };

  const handleDownload = () => {
    if (!photo?.file_url) return;

    // Open the download URL directly in the browser
    window.open(photo.file_url, '_blank');
    
    toast({
      title: "Download started",
      description: "Your download will begin in your browser",
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (!photo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Photo Details</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card className="overflow-hidden">
          <div 
            className="aspect-square bg-muted flex items-center justify-center cursor-zoom-in relative group"
            onClick={() => (watermarkedImage || photo.preview_image) && setImageViewerOpen(true)}
          >
            {watermarkedImage ? (
              <img
                src={watermarkedImage}
                alt={photo.client_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : photo.preview_image ? (
              <img
                src={photo.preview_image}
                alt={photo.client_name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <FileArchive className="h-32 w-32 text-muted-foreground" />
            )}
            {(watermarkedImage || photo.preview_image) && (
              <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-muted-foreground">
                Tap to zoom
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{photo.client_name}</CardTitle>
                <div className="space-y-1 mt-2">
                  <p className="text-muted-foreground">
                    Size: {formatFileSize(photo.file_size)}
                  </p>
                  {photo.shooting_date && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(photo.shooting_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/photo/${photo.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: photo.client_name,
                        text: `Check out this photo on Kaung Computer!`,
                        url: shareUrl,
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast({
                        title: "Link copied!",
                        description: "Photo link copied to clipboard",
                      });
                    }
                  }}
                  className="shrink-0"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavourite}
                  className="shrink-0"
                >
                  <Heart
                    className={`h-6 w-6 ${
                      isFavourite ? "fill-primary text-primary" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the download button below to get your photos in ZIP format
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={handleDownload}>
              <Download className="mr-2 h-5 w-5" />
              Download Photos
            </Button>
          </CardFooter>
        </Card>

        {/* Image Viewer for pinch-to-zoom */}
        <ImageViewer
          src={watermarkedImage || photo.preview_image || ""}
          alt={photo.client_name}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    </div>
  );
};

export default PhotoDetail;
