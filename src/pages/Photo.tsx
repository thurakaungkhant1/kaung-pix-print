import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

interface Photo {
  id: string;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
}

const Photo = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPhotos();
    if (user) loadFavourites();
  }, [user]);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPhotos(data);
    }
    setLoading(false);
  };

  const loadFavourites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favourite_photos")
      .select("photo_id")
      .eq("user_id", user.id);

    if (data) {
      setFavourites(new Set(data.map((f) => f.photo_id)));
    }
  };

  const toggleFavourite = async (photoId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add favourites",
        variant: "destructive",
      });
      return;
    }

    const isFav = favourites.has(photoId);

    if (isFav) {
      await supabase
        .from("favourite_photos")
        .delete()
        .eq("user_id", user.id)
        .eq("photo_id", photoId);

      setFavourites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    } else {
      await supabase
        .from("favourite_photos")
        .insert({ user_id: user.id, photo_id: photoId });

      setFavourites((prev) => new Set(prev).add(photoId));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-center">Kaung Computer</h1>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <FileArchive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No photos available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo) => (
              <Card
                key={photo.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/photo/${photo.id}`)}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center">
                  {photo.preview_image ? (
                    <img
                      src={photo.preview_image}
                      alt={photo.client_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileArchive className="h-16 w-16 text-muted-foreground" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(photo.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favourites.has(photo.id)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm truncate">{photo.client_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(photo.file_size)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Photo;
