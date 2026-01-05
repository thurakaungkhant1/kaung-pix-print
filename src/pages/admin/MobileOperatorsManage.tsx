import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Smartphone, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface MobileOperator {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  is_active: boolean;
  display_order: number;
}

const MobileOperatorsManage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [operators, setOperators] = useState<MobileOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    logo_url: "",
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      loadOperators();
    }
  }, [isAdmin]);

  const loadOperators = async () => {
    try {
      const { data, error } = await supabase
        .from("mobile_operators")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setOperators(data || []);
    } catch (error: any) {
      toast.error("Failed to load operators");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please select an image under 2MB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (operatorCode: string): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${operatorCode}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('operator-logos')
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('operator-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload logo");
      console.error(error);
      return formData.logo_url || null;
    } finally {
      setUploading(false);
    }
  };

  const clearLogoPreview = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Upload logo if file selected
      const logoUrl = await uploadLogo(formData.code.toLowerCase());

      if (selectedOperator) {
        const { error } = await supabase
          .from("mobile_operators")
          .update({
            name: formData.name,
            code: formData.code.toLowerCase(),
            logo_url: logoUrl,
            is_active: formData.is_active,
            display_order: formData.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedOperator.id);

        if (error) throw error;
        toast.success("Operator updated");
      } else {
        const { error } = await supabase
          .from("mobile_operators")
          .insert({
            name: formData.name,
            code: formData.code.toLowerCase(),
            logo_url: logoUrl,
            is_active: formData.is_active,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success("Operator created");
      }

      setDialogOpen(false);
      resetForm();
      loadOperators();
    } catch (error: any) {
      toast.error(error.message || "Failed to save operator");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOperator) return;

    try {
      const { error } = await supabase
        .from("mobile_operators")
        .delete()
        .eq("id", selectedOperator.id);

      if (error) throw error;
      toast.success("Operator deleted");
      setDeleteDialogOpen(false);
      setSelectedOperator(null);
      loadOperators();
    } catch (error: any) {
      toast.error("Failed to delete operator");
    }
  };

  const toggleActive = async (operator: MobileOperator) => {
    try {
      const { error } = await supabase
        .from("mobile_operators")
        .update({ is_active: !operator.is_active })
        .eq("id", operator.id);

      if (error) throw error;
      loadOperators();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      logo_url: "",
      is_active: true,
      display_order: operators.length,
    });
    setSelectedOperator(null);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const openEditDialog = (operator: MobileOperator) => {
    setSelectedOperator(operator);
    setFormData({
      name: operator.name,
      code: operator.code,
      logo_url: operator.logo_url || "",
      is_active: operator.is_active,
      display_order: operator.display_order,
    });
    setLogoFile(null);
    setLogoPreview(null);
    setDialogOpen(true);
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin-dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Mobile Operators</h1>
              <p className="text-xs text-muted-foreground">{operators.length} operators</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedOperator ? "Edit Operator" : "Add Operator"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. MPT"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. mpt"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier (lowercase)</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  
                  {logoPreview || formData.logo_url ? (
                    <div className="relative w-20 h-20 mx-auto">
                      <img
                        src={logoPreview || formData.logo_url}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-xl border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          clearLogoPreview();
                          setFormData({ ...formData, logo_url: "" });
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload Logo</span>
                      </div>
                    </Button>
                  )}
                  
                  {!logoPreview && !formData.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Or click to select image
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {selectedOperator ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Operators List */}
      <div className="p-4 space-y-3">
        {operators.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No operators yet</p>
            </CardContent>
          </Card>
        ) : (
          operators.map((operator) => (
            <Card key={operator.id} className={!operator.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {operator.logo_url ? (
                      <img src={operator.logo_url} alt={operator.name} className="h-8 w-8 object-contain" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{operator.name}</h3>
                    <p className="text-xs text-muted-foreground">Code: {operator.code}</p>
                  </div>
                  
                  <Switch
                    checked={operator.is_active}
                    onCheckedChange={() => toggleActive(operator)}
                  />
                  
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(operator)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      setSelectedOperator(operator);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Operator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedOperator?.name}"? This action cannot be undone.
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
    </div>
  );
};

export default MobileOperatorsManage;
