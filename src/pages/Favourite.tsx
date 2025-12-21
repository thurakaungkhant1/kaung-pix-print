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
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <Heart className="h-20 w-20 mx-auto text-muted-foreground relative" />
      </div>
      <h3 className="text-xl font-display font-semibold mb-2">
        No favourite {type} yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {type === 'products' 
          ? "When you find products you love, tap the heart to save them here!"
          : "Save your favorite photos by tapping the heart icon on any photo."
        }
      </p>
      <Button 
        onClick={() => navigate(type === 'products' ? '/' : '/photo')}
        size="lg"
        className="shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Explore {type === 'products' ? 'Products' : 'Photos'}
      </Button>
    </div>
  );

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <h1 className="text-2xl font-display font-bold">Kaung Computer</h1>
          <div className="flex-1 flex justify-end">
            <CartHeader />
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            Your Favourites
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            All the things you've saved in one place
          </p>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="products"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger 
              value="photos"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 flex items-center gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Photos ({photos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="animate-fade-in">
            {products.length === 0 ? (
              <EmptyState type="products" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map((product, index) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-2 right-2">
                        <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-lg" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-primary font-bold">{product.price.toLocaleString()} MMK</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos" className="animate-fade-in">
            {photos.length === 0 ? (
              <EmptyState type="photos" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <Card
                    key={photo.id}
                    className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 animate-fade-in"
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
                        <FileArchive className="h-16 w-16 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-2 right-2">
                        <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-lg" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {photo.client_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
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