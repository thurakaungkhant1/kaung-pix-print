import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PhotoNew = () => {
  const [clientName, setClientName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [category, setCategory] = useState("General");
  const [shootingDate, setShootingDate] = useState("");
  const [downloadPin, setDownloadPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (downloadPin && downloadPin.length !== 6) {
      toast({ title: "Error", description: "PIN code must be exactly 6 digits", variant: "destructive" });
      return;
    }
    if (downloadPin && !/^\d{6}$/.test(downloadPin)) {
      toast({ title: "Error", description: "PIN code must contain only numbers", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("photos").insert({
      client_name: clientName,
      file_url: fileUrl,
      file_size: parseInt(fileSize) * 1024 * 1024,
      preview_image: previewImage || null,
      category: category,
      shooting_date: shootingDate || null,
      download_pin: downloadPin || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to upload photos", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Photos uploaded successfully" });
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
                <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="fileUrl">ZIP File URL *</Label>
                <Input id="fileUrl" type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://example.com/photos.zip" required />
              </div>

              <div>
                <Label htmlFor="fileSize">File Size (MB) *</Label>
                <Input id="fileSize" type="number" value={fileSize} onChange={(e) => setFileSize(e.target.value)} placeholder="e.g., 5" required />
              </div>

              <div>
                <Label htmlFor="previewImage">Preview Image URL (optional)</Label>
                <Input id="previewImage" type="url" value={previewImage} onChange={(e) => setPreviewImage(e.target.value)} placeholder="https://example.com/preview.jpg" />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Wedding, Birthday, Event" required />
              </div>

              <div>
                <Label htmlFor="shootingDate">Photo Shooting Date (optional)</Label>
                <Input id="shootingDate" type="date" value={shootingDate} onChange={(e) => setShootingDate(e.target.value)} />
              </div>

              {/* Download PIN */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <Label htmlFor="downloadPin" className="text-sm font-semibold">Download PIN Code (6 digits)</Label>
                </div>
                <Input
                  id="downloadPin"
                  value={downloadPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setDownloadPin(val);
                  }}
                  placeholder="e.g., 123456"
                  maxLength={6}
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  PIN သတ်မှတ်ပါက user များ download လုပ်ရန် ဤ PIN ထည့်သွင်းရပါမည်။ မသတ်မှတ်ပါက free download ဖြစ်ပါမည်။
                </p>
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
