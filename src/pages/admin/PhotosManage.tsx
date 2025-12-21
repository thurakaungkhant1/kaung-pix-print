import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2, FileArchive, Pencil, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MobileLayout from "@/components/MobileLayout";

interface Photo {
  id: number;
  client_name: string;
  file_url: string;
  file_size: number;
  preview_image: string | null;
  category: string;
  shooting_date: string | null;
}

const CATEGORIES = ["General", "Wedding", "Portrait", "Event", "Product", "Nature", "Other"];

const PhotosManage = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState({
    client_name: "",
    category: "",
    shooting_date: "",
  });
  const [newPreviewImage, setNewPreviewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
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

  const openEditDialog = (photo: Photo) => {
    setSelectedPhoto(photo);
    setEditForm({
      client_name: photo.client_name,
      category: photo.category || "General",
      shooting_date: photo.shooting_date || "",
    });
    setNewPreviewImage(null);
    setPreviewUrl(photo.preview_image);
    setEditDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPreviewImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpdatePhoto = async () => {
    if (!selectedPhoto) return;

    setIsUpdating(true);
    try {
      let updateData: Partial<Photo> = {
        client_name: editForm.client_name,
        category: editForm.category,
        shooting_date: editForm.shooting_date || null,
      };

      // If a new preview image was selected, upload it
      if (newPreviewImage) {
        const fileExt = newPreviewImage.name.split(".").pop();
        const fileName = `preview_${selectedPhoto.id}_${Date.now()}.${fileExt}`;
        
        // Convert to base64 for preview_image field
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(newPreviewImage);
        });
        
        const base64Image = await base64Promise;
        updateData.preview_image = base64Image;
      }

      const { error } = await supabase
        .from("photos")
        .update(updateData)
        .eq("id", selectedPhoto.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Photo updated successfully",
      });

      setEditDialogOpen(false);
      loadPhotos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update photo",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <MobileLayout className="pb-8">
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
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(photo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deletePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Photo Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview Image */}
            <div className="space-y-2">
              <Label>Preview Image</Label>
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileArchive className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="preview-image-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("preview-image-input")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Preview Image
                </Button>
              </div>
            </div>

            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name / Title</Label>
              <Input
                id="client_name"
                value={editForm.client_name}
                onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                placeholder="Enter client name"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shooting Date */}
            <div className="space-y-2">
              <Label htmlFor="shooting_date">Shooting Date</Label>
              <Input
                id="shooting_date"
                type="date"
                value={editForm.shooting_date}
                onChange={(e) => setEditForm({ ...editForm, shooting_date: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdatePhoto}
                disabled={isUpdating || !editForm.client_name}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Photo"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default PhotosManage;
