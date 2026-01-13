import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Music, 
  Upload, 
  Trash2, 
  Play, 
  Pause, 
  Plus,
  Volume2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Music2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BackgroundMusic {
  id: string;
  name: string;
  file_url: string;
  page_location: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const PAGE_LOCATIONS = [
  { value: "photo_gallery", label: "Photo Gallery" },
  { value: "home", label: "Home Page" },
  { value: "shop", label: "Shop Page" },
];

const BackgroundMusicManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [musicList, setMusicList] = useState<BackgroundMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMusicName, setNewMusicName] = useState("");
  const [newMusicLocation, setNewMusicLocation] = useState("photo_gallery");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMusic();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const loadMusic = async () => {
    const { data, error } = await supabase
      .from("background_music")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load music list",
        variant: "destructive",
      });
    } else {
      setMusicList(data || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("audio")) {
        toast({
          title: "Invalid file",
          description: "Please select an audio file (MP3, WAV, etc.)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      if (!newMusicName) {
        setNewMusicName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newMusicName.trim()) {
      toast({
        title: "Missing info",
        description: "Please provide a name and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("background-music")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("background-music")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("background_music")
        .insert({
          name: newMusicName.trim(),
          file_url: publicUrl,
          page_location: newMusicLocation,
          display_order: musicList.length,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Background music uploaded successfully",
      });

      setShowAddForm(false);
      setNewMusicName("");
      setNewMusicLocation("photo_gallery");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadMusic();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (music: BackgroundMusic) => {
    const { error } = await supabase
      .from("background_music")
      .update({ is_active: !music.is_active })
      .eq("id", music.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      loadMusic();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const music = musicList.find((m) => m.id === deleteId);
    if (!music) return;

    try {
      // Extract file name from URL
      const urlParts = music.file_url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage.from("background-music").remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from("background_music")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Music file deleted successfully",
      });

      loadMusic();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const togglePlay = (music: BackgroundMusic) => {
    if (playingId === music.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(music.file_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(music.id);
    }
  };

  const getLocationLabel = (value: string) => {
    return PAGE_LOCATIONS.find((l) => l.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin")} className="btn-press">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6" />
            <h1 className="text-xl font-bold">Background Music</h1>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <Music2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{musicList.length}</p>
              <p className="text-xs text-muted-foreground">Total Tracks</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <Volume2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-500">
                {musicList.filter((m) => m.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">Active Tracks</p>
            </CardContent>
          </Card>
        </div>

        {/* Add New Button */}
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Music
          </Button>
        )}

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Music
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Music Name
                </label>
                <Input
                  placeholder="Enter music name..."
                  value={newMusicName}
                  onChange={(e) => setNewMusicName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Page Location
                </label>
                <Select
                  value={newMusicLocation}
                  onValueChange={setNewMusicLocation}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Audio File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer",
                    "hover:border-primary/50 hover:bg-primary/5 transition-all duration-300",
                    selectedFile
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Music className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">
                        {selectedFile.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select audio file
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        MP3, WAV, OGG supported
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMusicName("");
                    setSelectedFile(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !newMusicName.trim()}
                  className="flex-1 gap-2"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Music List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Music Library</h2>
          
          {musicList.length === 0 ? (
            <Card className="p-8 text-center">
              <Music className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No music uploaded yet</p>
            </Card>
          ) : (
            musicList.map((music) => (
              <Card
                key={music.id}
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  music.is_active
                    ? "border-primary/30 bg-primary/5"
                    : "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Play Button */}
                    <button
                      onClick={() => togglePlay(music)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        "transition-all duration-300 btn-press shrink-0",
                        playingId === music.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {playingId === music.id ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{music.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {getLocationLabel(music.page_location)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(music)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        {music.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteId(music.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Music?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the music file. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackgroundMusicManage;
