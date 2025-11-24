import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Download, ArrowLeft, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PinVerificationDialog from "@/components/PinVerificationDialog";

interface Photo {
  id: string;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
}

const PhotoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadPhoto();
    if (user) {
      checkFavourite();
      loadUserPin();
    }
  }, [id, user]);

  const loadUserPin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("download_pin")
      .eq("id", user.id)
      .single();

    if (data) {
      setUserPin(data.download_pin);
    }
  };

  const loadPhoto = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setPhoto(data);
    }
  };

  const checkFavourite = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from("favourite_photos")
      .select("id")
      .eq("user_id", user.id)
      .eq("photo_id", id)
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

    if (isFavourite) {
      await supabase
        .from("favourite_photos")
        .delete()
        .eq("user_id", user.id)
        .eq("photo_id", id);
    } else {
      await supabase
        .from("favourite_photos")
        .insert({ user_id: user.id, photo_id: id });
    }

    setIsFavourite(!isFavourite);
  };

  const handleDownload = () => {
    // Show PIN dialog instead of downloading directly
    setShowPinDialog(true);
  };

  const handlePinVerified = () => {
    if (photo?.file_url) {
      window.open(photo.file_url, "_blank");
      toast({
        title: "Download started",
        description: "Your photos are being downloaded",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
          <div className="aspect-square bg-muted flex items-center justify-center">
            {photo.preview_image ? (
              <img
                src={photo.preview_image}
                alt={photo.client_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileArchive className="h-32 w-32 text-muted-foreground" />
            )}
          </div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{photo.client_name}</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Size: {formatFileSize(photo.file_size)}
                </p>
              </div>
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
      </div>

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onVerified={handlePinVerified}
        storedPin={userPin}
      />
    </div>
  );
};

export default PhotoDetail;
