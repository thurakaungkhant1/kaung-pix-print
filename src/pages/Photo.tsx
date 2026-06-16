import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, FileArchive, Search, Camera, ArrowLeft, Lock, Download, Music2, Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  created_at?: string;
  photo_count?: number;
}

const PAGE_SIZE = 12;

const Photo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [watermarkedImages, setWatermarkedImages] = useState<Map<number, string>>(new Map());
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showSearch, setShowSearch] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const CACHE_KEY = "photo_gallery_cache_v1";
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

  useEffect(() => {
    // 0) Hydrate from cache instantly so the gallery appears with zero wait
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; photos: Photo[] };
        if (parsed?.photos?.length) {
          setPhotos(parsed.photos);
          const cats = Array.from(new Set(parsed.photos.map((p) => p.category || "General")));
          setCategories(["All", ...cats.sort()]);
          setLoading(false);

          // Warm the browser image cache for the first visible previews
          parsed.photos.slice(0, 24).forEach((p) => {
            if (p.preview_image) {
              const img = new Image();
              img.decoding = "async";
              img.src = p.preview_image;
            }
          });
        }
      }
    } catch {
      // ignore cache errors
    }

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

  const writeCache = (photos: Photo[]) => {
    try {
      // Cap the cache so we don't blow past localStorage quota
      const capped = photos.slice(0, 500);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), photos: capped }));
    } catch {
      // quota exceeded — try a smaller slice, otherwise give up silently
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), photos: photos.slice(0, 200) })
        );
      } catch {}
    }
  };

  const loadPhotos = async () => {
    const SELECT_COLS = "id, client_name, file_url, file_size, preview_image, category, created_at";

    // 1) Fast initial fetch: first 12 albums for instant display
    const firstBatch = await supabase
      .from("photos")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false })
      .range(0, 11);

    if (!firstBatch.error && firstBatch.data) {
      const firstData = firstBatch.data as Photo[];
      setPhotos(firstData);
      const uniqueCategories = Array.from(new Set(firstData.map((p) => p.category || "General")));
      setCategories(["All", ...uniqueCategories.sort()]);
      setLoading(false);
      writeCache(firstData);

      // 2) Background fetch: stream remaining albums in pages so UI stays responsive
      if (firstBatch.data.length === 12) {
        const fetchPage = async (from: number, to: number) => {
          const { data, error } = await supabase
            .from("photos")
            .select(SELECT_COLS)
            .order("created_at", { ascending: false })
            .range(from, to);
          if (error || !data || data.length === 0) return 0;
          let merged: Photo[] = [];
          setPhotos((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const combined = [...prev, ...(data as Photo[]).filter((p) => !seen.has(p.id))];
            const cats = Array.from(new Set(combined.map((p) => p.category || "General")));
            setCategories(["All", ...cats.sort()]);
            merged = combined;
            return combined;
          });
          // Persist progressively so reloads are fast even mid-stream
          if (merged.length) writeCache(merged);
          return data.length;
        };

        // Chunked background loading (100 at a time)
        (async () => {
          let from = 12;
          const CHUNK = 100;
          await new Promise((r) => setTimeout(r, 50));
          while (true) {
            const n = await fetchPage(from, from + CHUNK - 1);
            if (n < CHUNK) break;
            from += CHUNK;
            if (from > 5000) break;
          }
        })();
      }
    } else {
      setLoading(false);
    }
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

  const filteredPhotos = useMemo(() => photos
    .filter((photo) => {
      const matchesCategory = selectedCategory === "All" || photo.category === selectedCategory;
      const matchesSearch = photo.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFav = !favouritesOnly || favourites.has(photo.id);
      return matchesCategory && matchesSearch && matchesFav;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.client_name.localeCompare(b.client_name);
        case "name_desc": return b.client_name.localeCompare(a.client_name);
        case "size_asc": return (a.file_size || 0) - (b.file_size || 0);
        case "size_desc": return (b.file_size || 0) - (a.file_size || 0);
        default: return 0;
      }
    }), [photos, selectedCategory, searchQuery, favouritesOnly, favourites, sortBy]);

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPhotos.length;

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredPhotos.length));
      }
    }, { rootMargin: "400px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, filteredPhotos.length]);

  const formatDate = (s?: string) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return ""; }
  };

  if (loading) {
    return (
      <MobileLayout className="bg-background">
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="w-10 h-10 rounded-full bg-muted animate-shimmer" />
            <div className="w-24 h-10 rounded-full bg-muted animate-shimmer" />
            <div className="w-10 h-10 rounded-full bg-muted animate-shimmer" />
          </div>
          <div className="h-8 w-48 bg-muted rounded animate-shimmer mb-2" />
          <div className="h-4 w-56 bg-muted rounded animate-shimmer" />
        </header>
        <div className="px-5 pb-32 space-y-4">
          <div className="h-16 rounded-2xl bg-muted animate-shimmer" />
          <div className="flex gap-2 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-muted animate-shimmer flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-card border border-border/60 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="aspect-[4/5] bg-muted animate-shimmer" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 bg-muted rounded animate-shimmer w-3/4" />
                  <div className="h-2.5 bg-muted rounded animate-shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2 animate-pulse">
            Loading gallery…
          </p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <AnimatedPage>
      <MobileLayout className="bg-background">
        {/* Top Bar */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-5">
            <button
              onClick={() => navigate("/account")}
              className="w-10 h-10 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-card border border-border/60">
              <Music2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">10% Vol</span>
            </div>
            <button
              onClick={() => setShowSearch((s) => !s)}
              className={cn(
                "w-10 h-10 rounded-full border border-border/60 flex items-center justify-center transition-colors",
                showSearch ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
              )}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-3xl font-display font-black text-foreground tracking-tight">
              Photo Gallery
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Secure & Premium Collections</p>
          </motion.div>

          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-4 overflow-hidden"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search albums..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 rounded-2xl bg-card border-border/60"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-11 w-[120px] rounded-2xl bg-card border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                    <SelectItem value="size_asc">Size: Small</SelectItem>
                    <SelectItem value="size_desc">Size: Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </header>

        <AdBanner pageLocation="photo" position="top" className="px-5 pb-2" />

        <div className="max-w-screen-xl mx-auto px-5 pb-32 space-y-4">
          {/* PIN Protected notice */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-dashed border-border"
          >
            <div className="p-2 rounded-xl bg-muted">
              <Lock className="h-4 w-4 text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary">PIN Protected Downloads</p>
              <p className="text-[11px] text-muted-foreground">6-digit OTP required for ZIP extraction</p>
            </div>
          </motion.div>

          {/* Category pills */}
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Favourites toggle + count */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground font-medium">
              {filteredPhotos.length} album{filteredPhotos.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <Heart className={cn("h-3.5 w-3.5", favouritesOnly && "fill-destructive text-destructive")} />
              <Label htmlFor="fav-only" className="text-xs cursor-pointer">Favourites only</Label>
              <Switch id="fav-only" checked={favouritesOnly} onCheckedChange={setFavouritesOnly} />
            </div>
          </div>

          {/* Album list */}
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
              <p className="text-lg text-foreground font-semibold mb-1">No albums found</p>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === "All" ? "Check back soon for new uploads" : `No albums in "${selectedCategory}"`}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {visiblePhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * Math.min(index, 8), duration: 0.35 }}
                  onClick={() => navigate(`/photo/${photo.id}`)}
                  className="group cursor-pointer relative rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all"
                >
                  {/* Preview area */}
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                    {photo.preview_image ? (
                      <img
                        src={photo.preview_image}
                        alt={photo.client_name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileArchive className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* CSS watermark overlay (replaces slow canvas watermark) */}
                    {photo.preview_image && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center pb-2">
                        <span className="text-[10px] font-bold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] tracking-wide">
                          kaungcomputer.com
                        </span>
                      </div>
                    )}

                    {/* Photo count badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-md text-foreground text-[10px] font-semibold shadow-sm">
                      <ImageIcon className="h-2.5 w-2.5 text-primary" />
                      {photo.photo_count || Math.max(1, Math.round((photo.file_size || 0) / (1024 * 1024 * 2)))}
                    </div>

                    {/* Favourite */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavourite(photo.id); }}
                      className={cn(
                        "absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90",
                        favourites.has(photo.id)
                          ? "bg-destructive text-destructive-foreground shadow-lg"
                          : "bg-background/70 text-foreground/70 hover:bg-background/90"
                      )}
                    >
                      <Heart className={cn("h-3.5 w-3.5", favourites.has(photo.id) && "fill-current")} />
                    </button>
                  </div>


                  {/* Footer row: title/date + download */}
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {photo.client_name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {formatDate(photo.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/photo/${photo.id}`); }}
                      className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md transition-colors flex-shrink-0"
                      aria-label="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
