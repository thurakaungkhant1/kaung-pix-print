import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, FileArchive, Users, Search, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineUsers } from "@/contexts/OnlineUsersContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";
import { Input } from "@/components/ui/input";
import { addWatermark } from "@/lib/watermarkUtils";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [watermarkedImages, setWatermarkedImages] = useState<Map<number, string>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { onlineCount } = useOnlineUsers();

  useEffect(() => {
    loadPhotos();
    if (user) loadFavourites();
  }, [user]);

  useEffect(() => {
    photos.forEach(async (photo) => {
      if (photo.preview_image && !watermarkedImages.has(photo.id)) {
        try {
          const watermarked = await addWatermark(photo.preview_image);
          setWatermarkedImages((prev) => new Map(prev).set(photo.id, watermarked));
        } catch (error) {
          console.error("Failed to add watermark:", error);
        }
      }
    });
  }, [photos]);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPhotos(data);
      
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
    if (!bytes || bytes === 0) return "N/A";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="aspect-square rounded-2xl animate-shimmer" 
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const filteredPhotos = photos
    .filter((photo) => {
      const matchesCategory = selectedCategory === "All" || photo.category === selectedCategory;
      const matchesSearch = photo.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  return (
    <MobileLayout>
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        
        <div className="relative z-10 p-4 pt-6 pb-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-5">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "bg-primary-foreground/10 border border-primary-foreground/20"
            )}>
              <div className="relative">
                <Users className="h-4 w-4 text-primary-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-semibold text-primary-foreground">{onlineCount} Online</span>
            </div>
            
            <h1 className="text-2xl font-display font-bold text-primary-foreground tracking-tight">
              Photos
            </h1>
            
            <CartHeader />
          </div>
          
          {/* Search bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary-foreground/10 rounded-2xl blur group-focus-within:blur-lg transition-all duration-300" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-primary-foreground/50 transition-colors group-focus-within:text-primary-foreground/80" />
              <Input
                type="text"
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-11 pr-4 py-3 h-12 rounded-2xl",
                  "bg-primary-foreground/10 border-primary-foreground/20",
                  "text-primary-foreground placeholder:text-primary-foreground/50",
                  "focus:bg-primary-foreground/15 focus:border-primary-foreground/30",
                  "transition-all duration-300"
                )}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-5">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map((category, index) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2.5 rounded-xl whitespace-nowrap font-medium text-sm",
                "transition-all duration-300 active:scale-95",
                "animate-fade-in",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-soft" />
              <Camera className="relative h-20 w-20 text-muted-foreground" />
            </div>
            <p className="text-lg text-muted-foreground font-medium">
              {selectedCategory === "All"
                ? "No photos available yet"
                : `No photos in ${selectedCategory} category`}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for new uploads</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <Card
                key={photo.id}
                className="product-card cursor-pointer animate-scale-in overflow-hidden group"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/photo/${photo.id}`)}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden rounded-t-xl">
                  {photo.preview_image ? (
                    <img
                      src={watermarkedImages.get(photo.id) || photo.preview_image}
                      alt={photo.client_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <FileArchive className="h-12 w-12 text-muted-foreground" />
                  )}
                  
                  {/* Favourite button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(photo.id);
                    }}
                    className={cn(
                      "absolute top-2.5 right-2.5 p-2 rounded-full",
                      "glass border-0 transition-all duration-300",
                      "hover:scale-110 active:scale-95",
                      favourites.has(photo.id) 
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                        : "bg-background/80 text-muted-foreground hover:bg-background"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        favourites.has(photo.id) && "fill-current text-white"
                      )}
                    />
                  </button>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
                </div>
                
                <CardContent className="p-3 space-y-1">
                  <span className="badge-modern text-[10px]">
                    {photo.category || "General"}
                  </span>
                  <h3 className="font-semibold text-sm truncate">{photo.client_name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Photo;