import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, FileArchive, Search, Camera, Sparkles, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CartHeader from "@/components/CartHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addWatermark } from "@/lib/watermarkUtils";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import MusicPlayer from "@/components/MusicPlayer";
import AdBanner from "@/components/AdBanner";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { motion } from "framer-motion";

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  category: string;
}

const PAGE_SIZE = 18;

const Photo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [watermarkedImages, setWatermarkedImages] = useState<Map<number, string>>(new Map());
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // URL-driven state
  const searchQuery = searchParams.get("q") ?? "";
  const selectedCategory = searchParams.get("cat") ?? "All";
  const sortBy = (searchParams.get("sort") as "newest" | "name_asc" | "name_desc" | "size_asc" | "size_desc") || "newest";
  const favouritesOnly = searchParams.get("fav") === "1";

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "All" || value === "newest" || value === "") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  };

  const setSearchQuery = (v: string) => updateParam("q", v);
  const setSelectedCategory = (v: string) => updateParam("cat", v);
  const setSortBy = (v: string) => updateParam("sort", v);
  const setFavouritesOnly = (v: boolean) => updateParam("fav", v ? "1" : null);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPhotos();
    loadBackgroundMusic();
    if (user) loadFavourites();
  }, [user]);

  const loadBackgroundMusic = async () => {
    const { data } = await supabase
      .from("background_music")
      .select("file_url")
      .eq("page_location", "photo_gallery")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(1)
      .single();
    if (data?.file_url) setBackgroundMusic(data.file_url);
  };

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
      const uniqueCategories = Array.from(new Set(data.map((p) => p.category || "General")));
      setCategories(["All", ...uniqueCategories.sort()]);
    }
    setLoading(false);
  };

  const loadFavourites = async () => {
    if (!user) return;
    const { data } = await supabase.from("favourite_photos").select("photo_id").eq("user_id", user.id);
    if (data) setFavourites(new Set(data.map((f) => f.photo_id)));
  };

  const toggleFavourite = async (photoId: number) => {
    if (!user) {
      toast({ title: "Login required", description: "Please login to add favourites", variant: "destructive" });
      return;
    }
    if (favourites.has(photoId)) {
      await supabase.from("favourite_photos").delete().eq("user_id", user.id).eq("photo_id", photoId);
      setFavourites((prev) => { const s = new Set(prev); s.delete(photoId); return s; });
    } else {
      await supabase.from("favourite_photos").insert({ user_id: user.id, photo_id: photoId });
      setFavourites((prev) => new Set(prev).add(photoId));
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="relative z-10 p-4 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="w-10" />
              <div className="h-8 w-24 bg-primary-foreground/20 rounded animate-pulse" />
              <div className="w-10" />
            </div>
            <div className="h-12 bg-primary-foreground/10 rounded-2xl animate-pulse" />
          </div>
        </header>
        <div className="max-w-screen-xl mx-auto p-4 space-y-5">
          <div className="flex gap-2 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 px-8 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} variant="photo" />
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  const filteredPhotos = photos
    .filter((photo) => {
      const matchesCategory = selectedCategory === "All" || photo.category === selectedCategory;
      const matchesSearch = photo.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.client_name.localeCompare(b.client_name);
        case "name_desc": return b.client_name.localeCompare(a.client_name);
        case "size_asc": return (a.file_size || 0) - (b.file_size || 0);
        case "size_desc": return (b.file_size || 0) - (a.file_size || 0);
        default: return 0;
      }
    });

  return (
    <AnimatedPage>
      <MobileLayout>
        {/* Hero Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-glow opacity-60" />
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-foreground/5 rounded-full blur-2xl" />

          <div className="relative z-10 p-4 pt-6 pb-6">
            <div className="flex items-center justify-between mb-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/account")}
                className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Camera className="h-5 w-5 text-primary-foreground/80" />
                <h1 className="text-2xl font-display font-bold text-primary-foreground tracking-tight">
                  Gallery
                </h1>
              </motion.div>
              <CartHeader />
            </div>

            {/* Search + Sort */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50 z-10" />
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
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-12 w-[130px] rounded-2xl bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                  <SelectItem value="name_desc">Name Z-A</SelectItem>
                  <SelectItem value="size_asc">Size: Small</SelectItem>
                  <SelectItem value="size_desc">Size: Large</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </header>

        <AdBanner pageLocation="photo" position="top" className="px-4 pt-4" />

        <div className="max-w-screen-xl mx-auto p-4 space-y-5">
          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
          >
            {categories.map((category, index) => (
              <motion.button
                key={category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.04 }}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2.5 rounded-xl whitespace-nowrap font-medium text-sm",
                  "transition-all duration-300 active:scale-95",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>

          {/* Results Count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <p className="text-xs text-muted-foreground font-medium">
              {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""} found
            </p>
            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="text-xs text-primary font-medium hover:underline"
              >
                Clear filter
              </button>
            )}
          </motion.div>

          {/* Content */}
          {filteredPhotos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-5">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
                <Camera className="relative h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg text-foreground font-semibold mb-1">No photos found</p>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === "All"
                  ? "Check back soon for new uploads"
                  : `No photos in "${selectedCategory}" category`}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(index, 12), duration: 0.4 }}
                  onClick={() => navigate(`/photo/${photo.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300">
                    {/* Image */}
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                      {photo.preview_image ? (
                        <img
                          src={watermarkedImages.get(photo.id) || photo.preview_image}
                          alt={photo.client_name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileArchive className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Favourite button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(photo.id);
                        }}
                        className={cn(
                          "absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center",
                          "backdrop-blur-md transition-all duration-300 active:scale-90",
                          favourites.has(photo.id)
                            ? "bg-destructive text-destructive-foreground shadow-lg"
                            : "bg-background/60 text-foreground/70 hover:bg-background/80"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-3.5 w-3.5 transition-all",
                            favourites.has(photo.id) && "fill-current"
                          )}
                        />
                      </button>

                      {/* Category badge */}
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-background/70 backdrop-blur-md text-foreground/80">
                          {photo.category || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {photo.client_name}
                      </h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {backgroundMusic && (
          <MusicPlayer audioSrc={backgroundMusic} className="bottom-24 right-4" autoPlay={true} />
        )}
      </MobileLayout>
    </AnimatedPage>
  );
};

export default Photo;
