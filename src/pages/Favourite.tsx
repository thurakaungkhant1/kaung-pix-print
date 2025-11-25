import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, FileArchive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import CartHeader from "@/components/CartHeader";

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <h1 className="text-2xl font-bold">Kaung Computer</h1>
          <div className="flex-1 flex justify-end">
            <CartHeader />
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favourite products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="relative aspect-square bg-muted">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <p className="text-primary font-bold">{product.price.toLocaleString()} MMK</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos">
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favourite photos yet</p>
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
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Favourite;
