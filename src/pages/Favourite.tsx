import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  FileArchive,
  ShoppingBag,
  ImageIcon,
  Sparkles,
  Gamepad2,
  Smartphone,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/MobileLayout";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import AnimatedPage from "@/components/animations/AnimatedPage";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
}

interface Photo {
  id: number;
  client_name: string;
  file_size: number;
  preview_image: string | null;
}

const GAME_CATEGORIES = ["MLBB Diamonds", "PUBG UC"];
const MOBILE_CATEGORIES = ["Phone Top-up", "Data Plans"];

const Favourite = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || localStorage.getItem("favLastTab") || "games";
  const [tab, setTab] = useState<string>(["games", "mobile", "photos"].includes(initialTab) ? initialTab : "games");

  useEffect(() => {
    localStorage.setItem("favLastTab", tab);
    if (searchParams.get("tab") !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
  }, [tab]);

  useEffect(() => {
    if (user) {
      Promise.all([loadFavouriteProducts(), loadFavouritePhotos()]).finally(() =>
        setLoading(false)
      );
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavouriteProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("favourite_products")
      .select("product_id, products(id, name, price, image_url, category)")
      .eq("user_id", user.id);
    if (data) setProducts(data.map((f: any) => f.products).filter(Boolean));
  };

  const loadFavouritePhotos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("favourite_photos")
      .select("photo_id, photos(id, client_name, file_size, preview_image)")
      .eq("user_id", user.id);
    if (data) setPhotos(data.map((f: any) => f.photos).filter(Boolean));
  };

  const gameItems = useMemo(
    () => products.filter((p) => GAME_CATEGORIES.includes(p.category)),
    [products]
  );
  const mobileItems = useMemo(
    () => products.filter((p) => MOBILE_CATEGORIES.includes(p.category)),
    [products]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const EmptyState = ({
    icon: Icon,
    title,
    desc,
    cta,
    onClick,
  }: {
    icon: React.ElementType;
    title: string;
    desc: string;
    cta: string;
    onClick: () => void;
  }) => (
    <div className="text-center py-14 animate-fade-in">
      <div className="relative inline-block mb-5">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
          <Icon className="h-10 w-10 text-primary/70" />
        </div>
      </div>
      <h3 className="text-base font-display font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground mb-5 max-w-xs mx-auto text-sm">{desc}</p>
      <Button onClick={onClick} size="sm" className="rounded-xl">
        <Sparkles className="mr-2 h-4 w-4" />
        {cta}
      </Button>
    </div>
  );

  const ProductCard = ({ product, index }: { product: Product; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        onClick={() => navigate(`/product/${product.id}`)}
        className="overflow-hidden cursor-pointer group border-border/50 hover:border-primary/40 hover:shadow-lg transition-all rounded-2xl"
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center shadow-md">
            <Heart className="h-4 w-4 fill-destructive text-destructive" />
          </div>
        </div>
        <CardContent className="p-3 space-y-1">
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-primary font-display font-bold text-base">
            {product.price.toLocaleString()}
            <span className="text-[10px] font-medium text-muted-foreground ml-0.5">Ks</span>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );

  const PhotoCard = ({ photo, index }: { photo: Photo; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        onClick={() => navigate(`/photo/${photo.id}`)}
        className="overflow-hidden cursor-pointer group border-border/50 hover:border-primary/40 hover:shadow-lg transition-all rounded-2xl"
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          {photo.preview_image ? (
            <img
              src={photo.preview_image}
              alt={photo.client_name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <FileArchive className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center shadow-md">
            <Heart className="h-4 w-4 fill-destructive text-destructive" />
          </div>
        </div>
        <CardContent className="p-3 space-y-1">
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {photo.client_name}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <FileArchive className="h-3 w-3" />
            {formatFileSize(photo.file_size)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );

  const SectionGrid = ({
    items,
    emptyState,
    renderItem,
  }: {
    items: any[];
    emptyState: React.ReactNode;
    renderItem: (item: any, index: number) => React.ReactNode;
  }) => {
    if (loading) return <SkeletonGrid count={4} columns={2} />;
    if (items.length === 0) return <>{emptyState}</>;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item, i) => renderItem(item, i))}
      </div>
    );
  };

  return (
    <AnimatedPage>
      <MobileLayout>
        {/* Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-glow opacity-60" />
          <div className="relative z-10 p-4 pt-6 pb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account")}
              className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary-foreground/80 fill-primary-foreground/80" />
              <h1 className="text-xl font-display font-bold text-primary-foreground tracking-tight">
                My Favourites
              </h1>
            </div>
            <div className="w-10" />
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 pb-24">
          <Tabs defaultValue="games" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-5 h-12 bg-muted/50 p-1 rounded-2xl">
              <TabsTrigger
                value="games"
                className={cn(
                  "rounded-xl gap-1.5 text-xs font-medium",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                )}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                Games
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                  {gameItems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="mobile"
                className={cn(
                  "rounded-xl gap-1.5 text-xs font-medium",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                  {mobileItems.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className={cn(
                  "rounded-xl gap-1.5 text-xs font-medium",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                )}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photos
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                  {photos.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="games" className="animate-fade-in">
              <SectionGrid
                items={gameItems}
                emptyState={
                  <EmptyState
                    icon={Gamepad2}
                    title="No favourite game items"
                    desc="MLBB Diamonds နဲ့ PUBG UC တွေထဲက ကြိုက်တာကို heart နှိပ်ပြီး သိမ်းထားနိုင်ပါတယ်။"
                    cta="Browse Games"
                    onClick={() => navigate("/game")}
                  />
                }
                renderItem={(p, i) => <ProductCard key={p.id} product={p} index={i} />}
              />
            </TabsContent>

            <TabsContent value="mobile" className="animate-fade-in">
              <SectionGrid
                items={mobileItems}
                emptyState={
                  <EmptyState
                    icon={Smartphone}
                    title="No favourite mobile services"
                    desc="Phone Top-up နဲ့ Data Plans တွေထဲက ကြိုက်တဲ့ packages တွေကို သိမ်းထားနိုင်ပါတယ်။"
                    cta="Browse Mobile"
                    onClick={() => navigate("/game")}
                  />
                }
                renderItem={(p, i) => <ProductCard key={p.id} product={p} index={i} />}
              />
            </TabsContent>

            <TabsContent value="photos" className="animate-fade-in">
              <SectionGrid
                items={photos}
                emptyState={
                  <EmptyState
                    icon={ImageIcon}
                    title="No favourite photos"
                    desc="Photo Gallery ထဲက ကြိုက်တဲ့ albums တွေကို heart နှိပ်ပြီး သိမ်းထားနိုင်ပါတယ်။"
                    cta="Browse Gallery"
                    onClick={() => navigate("/photo")}
                  />
                }
                renderItem={(p, i) => <PhotoCard key={p.id} photo={p} index={i} />}
              />
            </TabsContent>
          </Tabs>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default Favourite;
