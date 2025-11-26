import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  category: string;
  shooting_date: string | null;
}

const PhotosManage = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadPhotos();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      navigate("/");
    }
  };

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setPhotos(data);
    }
  };

  const deletePhoto = async (id: number) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    const { error } = await supabase.from("photos").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
      loadPhotos();
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Photos</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <Button onClick={() => navigate("/admin/photos/new")} className="w-full">
          Upload New Photos
        </Button>

        {photos.map((photo) => (
          <Card key={photo.id}>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="w-24 h-24 bg-muted rounded flex items-center justify-center overflow-hidden">
                  {photo.preview_image ? (
                    <img
                      src={photo.preview_image}
                      alt={photo.client_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileArchive className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {photo.category || "General"}
                    </span>
                  </div>
                  <h3 className="font-bold">{photo.client_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(photo.file_size)}
                  </p>
                  {photo.shooting_date && (
                    <p className="text-xs text-muted-foreground">
                      Date: {new Date(photo.shooting_date).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{photo.file_url}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deletePhoto(photo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PhotosManage;
