import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, FileArchive, ShoppingBag, ImageIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/MobileLayout";
import { SkeletonGrid } from "@/components/ui/skeleton-card";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
}

interface Photo {
  id: number;
  client_name: string;
  file_size: number;
  preview_image: string | null;
}

const Favourite = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadFavouriteProducts();
      loadFavouritePhotos();
    }
  }, [user]);

  const loadFavouriteProducts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favourite_products")
      .select("product_id, products(*)")
      .eq("user_id", user.id);

    if (data) {
      setProducts(data.map((f: any) => f.products).filter(Boolean));
    }
    setLoading(false);
  };

  const loadFavouritePhotos = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favourite_photos")
      .select("photo_id, photos(*)")
      .eq("user_id", user.id);

    if (data) {
      setPhotos(data.map((f: any) => f.photos).filter(Boolean));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const EmptyState = ({ type }: { type: 'products' | 'photos' }) => (
    <div className="text-center py-16 animate-fade-in">
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse-soft" />
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
          <Heart className="h-12 w-12 text-primary/60 icon-bounce" />
        </div>
      </div>
      <h3 className="text-xl font-display font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        No favourite {type} yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
        {type === 'products' 
          ? "When you find products you love, tap the heart to save them here!"
          : "Save your favorite photos by tapping the heart icon on any photo."
        }
      </p>
      <Button 
        onClick={() => navigate(type === 'products' ? '/' : '/photo')}
        size="lg"
        className="btn-press shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
      >
        <Sparkles className="mr-2 h-4 w-4 icon-bounce" />
        Explore {type === 'products' ? 'Products' : 'Photos'}
      </Button>
    </div>
  );

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
        {/* Enhanced Header */}
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-gradient-shift" />
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <h1 className="text-2xl font-display font-bold tracking-tight">Kaung Computer</h1>
            <div className="flex-1 flex justify-end">
              <CartHeader />
            </div>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4">
          {/* Enhanced Title Section */}
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center relative shadow-lg">
                  <Heart className="h-5 w-5 text-primary-foreground fill-primary-foreground" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Your Favourites
                </h2>
                <p className="text-muted-foreground text-sm">
                  All the things you've saved in one place
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm">
              <TabsTrigger 
                value="products"
                className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Products</span>
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                  {products.length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="photos"
                className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Photos</span>
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                  {photos.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="animate-fade-in">
              {loading ? (
                <SkeletonGrid count={4} />
              ) : products.length === 0 ? (
                <EmptyState type="products" />
              ) : (
                <div className="grid grid-cols-2 gap-4 stagger-children">
                  {products.map((product, index) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden cursor-pointer group hover-lift card-shine border-border/50 bg-card/80 backdrop-blur-sm animate-scale-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Favorite Badge */}
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50">
                            <Heart className="h-4 w-4 fill-primary text-primary" />
                          </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <div className="bg-primary text-primary-foreground text-xs font-medium py-2 px-3 rounded-lg text-center shadow-lg">
                            View Details
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3 space-y-1">
                        <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors duration-300">
                          {product.name}
                        </h3>
                        <p className="text-primary font-bold text-base">
                          {product.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">MMK</span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="animate-fade-in">
              {loading ? (
                <SkeletonGrid count={4} />
              ) : photos.length === 0 ? (
                <EmptyState type="photos" />
              ) : (
                <div className="grid grid-cols-2 gap-4 stagger-children">
                  {photos.map((photo, index) => (
                    <Card
                      key={photo.id}
                      className="overflow-hidden cursor-pointer group hover-lift card-shine border-border/50 bg-card/80 backdrop-blur-sm animate-scale-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/photo/${photo.id}`)}
                    >
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {photo.preview_image ? (
                          <img
                            src={photo.preview_image}
                            alt={photo.client_name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <FileArchive className="h-16 w-16 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Favorite Badge */}
                        <div className="absolute top-2 right-2">
                          <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50">
                            <Heart className="h-4 w-4 fill-primary text-primary" />
                          </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <div className="bg-primary text-primary-foreground text-xs font-medium py-2 px-3 rounded-lg text-center shadow-lg">
                            View Photo
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3 space-y-1">
                        <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors duration-300">
                          {photo.client_name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileArchive className="h-3 w-3" />
                          {formatFileSize(photo.file_size)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav />
      </div>
    </MobileLayout>
  );
};

export default Favourite;
