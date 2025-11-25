import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, FileArchive, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  category: string;
}

const Photo = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { onlineCount } = useOnlineUsers();

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
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((photo) => photo.category || "General"))
      );
      setCategories(["All", ...uniqueCategories.sort()]);
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

  const toggleFavourite = async (photoId: number) => {
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
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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

  const filteredPhotos =
    selectedCategory === "All"
      ? photos
      : photos.filter((photo) => photo.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-semibold">{onlineCount} Online</span>
          </div>
          <h1 className="text-2xl font-bold">Kaung Computer</h1>
          <div className="flex justify-end">
            <CartHeader />
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <FileArchive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {selectedCategory === "All"
                ? "No photos available yet"
                : `No photos in ${selectedCategory} category`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredPhotos.map((photo) => (
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
                  <div className="mb-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {photo.category || "General"}
                    </span>
                  </div>
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
