import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PhotoNew = () => {
  const [clientName, setClientName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [category, setCategory] = useState("General");
  const [shootingDate, setShootingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("photos").insert({
      client_name: clientName,
      file_url: fileUrl,
      file_size: parseInt(fileSize) * 1024 * 1024, // Convert MB to bytes
      preview_image: previewImage || null,
      category: category,
      shooting_date: shootingDate || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Photos uploaded successfully",
      });
      navigate("/admin/photos");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Upload Client Photos</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Photo Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="fileUrl">ZIP File URL *</Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/photos.zip"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fileSize">File Size (MB) *</Label>
                <Input
                  id="fileSize"
                  type="number"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g., 5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="previewImage">Preview Image URL (optional)</Label>
                <Input
                  id="previewImage"
                  type="url"
                  value={previewImage}
                  onChange={(e) => setPreviewImage(e.target.value)}
                  placeholder="https://example.com/preview.jpg"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Wedding, Birthday, Event"
                  required
                />
              </div>

              <div>
                <Label htmlFor="shootingDate">Photo Shooting Date (optional)</Label>
                <Input
                  id="shootingDate"
                  type="date"
                  value={shootingDate}
                  onChange={(e) => setShootingDate(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Uploading..." : "Upload Photos"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhotoNew;
