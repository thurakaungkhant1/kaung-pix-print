import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit2, Megaphone, Save, X, LayoutGrid, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface AdPlacement {
  id: string;
  name: string;
  placement_type: string;
  zone_id: string | null;
  script_code: string | null;
  page_location: string;
  position: string;
  is_active: boolean;
  display_order: number | null;
}

const PLACEMENT_TYPES = [
  { value: "banner", label: "Banner Ad" },
  { value: "interstitial", label: "Interstitial" },
  { value: "push", label: "Push Notification" },
  { value: "native", label: "Native Ad" },
];

const PAGE_LOCATIONS = [
  { value: "home", label: "Home Page" },
  { value: "photo", label: "Photo Gallery" },
  { value: "shop", label: "Shop Page" },
  { value: "account", label: "Account Page" },
  { value: "product_detail", label: "Product Detail" },
  { value: "all", label: "All Pages" },
];

const POSITIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "inline", label: "Inline (Between Content)" },
  { value: "floating", label: "Floating" },
];

const AdsManage = () => {
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<AdPlacement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    placement_type: "banner",
    zone_id: "",
    script_code: "",
    page_location: "home",
    position: "bottom",
    is_active: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = async () => {
    const { data, error } = await supabase
      .from("ad_placements")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load ad placements",
        variant: "destructive",
      });
    } else {
      setPlacements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a name for the placement",
        variant: "destructive",
      });
      return;
    }

    const placementData = {
      name: formData.name,
      placement_type: formData.placement_type,
      zone_id: formData.zone_id || null,
      script_code: formData.script_code || null,
      page_location: formData.page_location,
      position: formData.position,
      is_active: formData.is_active,
    };

    if (selectedPlacement) {
      const { error } = await supabase
        .from("ad_placements")
        .update(placementData)
        .eq("id", selectedPlacement.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update placement",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Placement updated successfully",
        });
        setDialogOpen(false);
        loadPlacements();
      }
    } else {
      const { error } = await supabase
        .from("ad_placements")
        .insert([placementData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create placement",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Placement created successfully",
        });
        setDialogOpen(false);
        loadPlacements();
      }
    }
  };

  const handleEdit = (placement: AdPlacement) => {
    setSelectedPlacement(placement);
    setFormData({
      name: placement.name,
      placement_type: placement.placement_type,
      zone_id: placement.zone_id || "",
      script_code: placement.script_code || "",
      page_location: placement.page_location,
      position: placement.position,
      is_active: placement.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPlacement) return;

    const { error } = await supabase
      .from("ad_placements")
      .delete()
      .eq("id", selectedPlacement.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete placement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Placement deleted successfully",
      });
      setDeleteDialogOpen(false);
      loadPlacements();
    }
  };

  const handleToggleActive = async (placement: AdPlacement) => {
    const { error } = await supabase
      .from("ad_placements")
      .update({ is_active: !placement.is_active })
      .eq("id", placement.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } else {
      loadPlacements();
    }
  };

  const openCreateDialog = () => {
    setSelectedPlacement(null);
    setFormData({
      name: "",
      placement_type: "banner",
      zone_id: "",
      script_code: "",
      page_location: "home",
      position: "bottom",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const getPlacementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      banner: "bg-blue-500/20 text-blue-500",
      interstitial: "bg-purple-500/20 text-purple-500",
      push: "bg-orange-500/20 text-orange-500",
      native: "bg-green-500/20 text-green-500",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50 p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">PropellerAds Management</h1>
              <p className="text-xs text-muted-foreground">Manage ad placements</p>
            </div>
            <Button onClick={openCreateDialog} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4">
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">PropellerAds Integration</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your PropellerAds Zone IDs or script codes here. Get your Zone ID from{" "}
                    <a 
                      href="https://partners.propellerads.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      PropellerAds Dashboard
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placements List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : placements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No Ad Placements</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add" to create your first ad placement
                </p>
              </CardContent>
            </Card>
          ) : (
            placements.map((placement) => (
              <Card key={placement.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm truncate">{placement.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPlacementTypeColor(placement.placement_type)}`}>
                          {placement.placement_type}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {PAGE_LOCATIONS.find(p => p.value === placement.page_location)?.label || placement.page_location}
                        </span>
                        <span>•</span>
                        <span>{POSITIONS.find(p => p.value === placement.position)?.label || placement.position}</span>
                      </div>
                      {placement.zone_id && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Zone: {placement.zone_id}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={placement.is_active}
                        onCheckedChange={() => handleToggleActive(placement)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(placement)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPlacement(placement);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlacement ? "Edit Placement" : "Create Ad Placement"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Placement Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Home Banner, Shop Interstitial"
              />
            </div>

            <div className="space-y-2">
              <Label>Ad Type</Label>
              <Select
                value={formData.placement_type}
                onValueChange={(value) => setFormData({ ...formData, placement_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zone ID (PropellerAds)</Label>
              <Input
                value={formData.zone_id}
                onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                placeholder="Enter your PropellerAds Zone ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Script Code (Optional)</Label>
              <Textarea
                value={formData.script_code}
                onChange={(e) => setFormData({ ...formData, script_code: e.target.value })}
                placeholder="Paste full script code if needed"
                rows={4}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page Location</Label>
                <Select
                  value={formData.page_location}
                  onValueChange={(value) => setFormData({ ...formData, page_location: value })}
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

              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {selectedPlacement ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Placement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlacement?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default AdsManage;