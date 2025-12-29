import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ArrowLeft } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badge_text: string | null;
  gradient_from: string;
  gradient_via: string | null;
  gradient_to: string;
  icon_name: string;
  link_url: string;
  link_text: string;
  display_order: number | null;
  is_active: boolean;
}

const GRADIENT_OPTIONS = [
  { value: 'rose-500', label: 'Rose' },
  { value: 'pink-500', label: 'Pink' },
  { value: 'orange-400', label: 'Orange' },
  { value: 'violet-600', label: 'Violet' },
  { value: 'purple-600', label: 'Purple' },
  { value: 'indigo-600', label: 'Indigo' },
  { value: 'emerald-500', label: 'Emerald' },
  { value: 'teal-500', label: 'Teal' },
  { value: 'cyan-500', label: 'Cyan' },
  { value: 'blue-500', label: 'Blue' },
  { value: 'green-500', label: 'Green' },
  { value: 'amber-500', label: 'Amber' },
  { value: 'red-500', label: 'Red' },
];

const ICON_OPTIONS = [
  'Percent', 'Crown', 'Package', 'Flame', 'Sparkles', 
  'Clock', 'Star', 'ShoppingBag', 'Camera', 'Shield', 'Users'
];

const BannersManageContent = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    badge_text: '',
    gradient_from: 'rose-500',
    gradient_via: 'pink-500',
    gradient_to: 'orange-400',
    icon_name: 'Percent',
    link_url: '/physical-products',
    link_text: 'Shop Now',
    display_order: 0,
    is_active: true,
  });

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('promotional_banners')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast.error('Failed to load banners');
      return;
    }
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bannerData = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      description: formData.description || null,
      badge_text: formData.badge_text || null,
      gradient_from: formData.gradient_from,
      gradient_via: formData.gradient_via || null,
      gradient_to: formData.gradient_to,
      icon_name: formData.icon_name,
      link_url: formData.link_url,
      link_text: formData.link_text,
      display_order: formData.display_order,
      is_active: formData.is_active,
    };

    if (editingBanner) {
      const { error } = await supabase
        .from('promotional_banners')
        .update(bannerData)
        .eq('id', editingBanner.id);

      if (error) {
        toast.error('Failed to update banner');
        return;
      }
      toast.success('Banner updated');
    } else {
      const { error } = await supabase
        .from('promotional_banners')
        .insert(bannerData);

      if (error) {
        toast.error('Failed to create banner');
        return;
      }
      toast.success('Banner created');
    }

    setIsDialogOpen(false);
    resetForm();
    fetchBanners();
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      badge_text: banner.badge_text || '',
      gradient_from: banner.gradient_from,
      gradient_via: banner.gradient_via || '',
      gradient_to: banner.gradient_to,
      icon_name: banner.icon_name,
      link_url: banner.link_url,
      link_text: banner.link_text,
      display_order: banner.display_order || 0,
      is_active: banner.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    const { error } = await supabase
      .from('promotional_banners')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete banner');
      return;
    }
    toast.success('Banner deleted');
    fetchBanners();
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from('promotional_banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id);

    if (error) {
      toast.error('Failed to update banner');
      return;
    }
    fetchBanners();
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      badge_text: '',
      gradient_from: 'rose-500',
      gradient_via: 'pink-500',
      gradient_to: 'orange-400',
      icon_name: 'Percent',
      link_url: '/physical-products',
      link_text: 'Shop Now',
      display_order: 0,
      is_active: true,
    });
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Promotional Banners</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Badge Text</Label>
                  <Input
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="e.g., Limited Time"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Up to 30% off"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Gradient From</Label>
                    <Select value={formData.gradient_from} onValueChange={(v) => setFormData({ ...formData, gradient_from: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Via</Label>
                    <Select value={formData.gradient_via} onValueChange={(v) => setFormData({ ...formData, gradient_via: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select value={formData.gradient_to} onValueChange={(v) => setFormData({ ...formData, gradient_to: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GRADIENT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={formData.icon_name} onValueChange={(v) => setFormData({ ...formData, icon_name: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(icon => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Link URL *</Label>
                    <Input
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link Text *</Label>
                    <Input
                      value={formData.link_text}
                      onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingBanner ? 'Update Banner' : 'Create Banner'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : banners.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No banners yet. Create your first one!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <Card key={banner.id} className={!banner.is_active ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{banner.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {banner.badge_text} • {banner.link_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(banner)}
                      >
                        {banner.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(banner)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(banner.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

const BannersManage = () => {
  return <BannersManageContent />;
};

export default BannersManage;
