import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Edit, Trash2, Crown, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/MobileLayout";

interface PremiumPlan {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  price_points: number;
  price_mmk: number | null;
  is_active: boolean;
  plan_type: string;
  badge_text: string | null;
}

const PremiumPlansManage = () => {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PremiumPlan | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_months: "1",
    price_points: "",
    price_mmk: "",
    plan_type: "subscription",
    badge_text: "",
    is_active: true,
  });
  const { isAdmin } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_plans")
      .select("*")
      .order("plan_type", { ascending: true })
      .order("duration_months", { ascending: true });

    if (data) {
      setPlans(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadPlans();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      duration_months: "1",
      price_points: "",
      price_mmk: "",
      plan_type: "subscription",
      badge_text: "",
      is_active: true,
    });
    setEditingPlan(null);
  };

  const openEditDialog = (plan: PremiumPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || "",
      duration_months: plan.duration_months.toString(),
      price_points: plan.price_points.toString(),
      price_mmk: plan.price_mmk?.toString() || "",
      plan_type: plan.plan_type,
      badge_text: plan.badge_text || "",
      is_active: plan.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price_points) {
      toast({ title: "Error", description: "Name and price are required", variant: "destructive" });
      return;
    }

    const planData = {
      name: form.name,
      description: form.description || null,
      duration_months: parseInt(form.duration_months),
      price_points: parseInt(form.price_points),
      price_mmk: form.price_mmk ? parseFloat(form.price_mmk) : null,
      plan_type: form.plan_type,
      badge_text: form.badge_text || null,
      is_active: form.is_active,
    };

    if (editingPlan) {
      const { error } = await supabase
        .from("premium_plans")
        .update(planData)
        .eq("id", editingPlan.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update plan", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Plan updated successfully" });
        loadPlans();
      }
    } else {
      const { error } = await supabase
        .from("premium_plans")
        .insert(planData);

      if (error) {
        toast({ title: "Error", description: "Failed to create plan", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Plan created successfully" });
        loadPlans();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!editingPlan) return;

    const { error } = await supabase
      .from("premium_plans")
      .delete()
      .eq("id", editingPlan.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete plan", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Plan deleted" });
      loadPlans();
    }

    setDeleteDialogOpen(false);
    setEditingPlan(null);
  };

  const toggleActive = async (plan: PremiumPlan) => {
    const { error } = await supabase
      .from("premium_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);

    if (!error) {
      loadPlans();
    }
  };

  const subscriptionPlans = plans.filter((p) => p.plan_type === "subscription");
  const microPlans = plans.filter((p) => p.plan_type === "microtransaction");

  if (!isAdmin) return null;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Premium Plans</h1>
              <p className="text-sm text-muted-foreground">Manage subscription plans</p>
            </div>
            <Button variant="outline" size="icon" onClick={loadPlans}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Subscription Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-amber-500" />
                Subscription Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>MMK</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No subscription plans yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptionPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{plan.name}</span>
                              {plan.badge_text && (
                                <Badge variant="secondary" className="text-xs">
                                  {plan.badge_text}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{plan.duration_months} month(s)</TableCell>
                          <TableCell>{plan.price_points.toLocaleString()}</TableCell>
                          <TableCell>{plan.price_mmk?.toLocaleString() || "-"}</TableCell>
                          <TableCell>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={() => toggleActive(plan)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingPlan(plan); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Micro-transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-500" />
                Micro-transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>MMK</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {microPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No micro-transactions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      microPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>{plan.price_points.toLocaleString()}</TableCell>
                          <TableCell>{plan.price_mmk?.toLocaleString() || "-"}</TableCell>
                          <TableCell>
                            <Switch
                              checked={plan.is_active}
                              onCheckedChange={() => toggleActive(plan)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingPlan(plan); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
              <DialogDescription>
                {editingPlan ? "Update the plan details" : "Create a new premium plan"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Plan Type</Label>
                <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="microtransaction">Micro-transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              {form.plan_type === "subscription" && (
                <div>
                  <Label>Duration (Months)</Label>
                  <Input
                    type="number"
                    value={form.duration_months}
                    onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                    className="mt-1"
                    min="1"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (Points) *</Label>
                  <Input
                    type="number"
                    value={form.price_points}
                    onChange={(e) => setForm({ ...form, price_points: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (MMK)</Label>
                  <Input
                    type="number"
                    value={form.price_mmk}
                    onChange={(e) => setForm({ ...form, price_mmk: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Badge Text (Optional)</Label>
                <Input
                  value={form.badge_text}
                  onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                  placeholder="e.g., Popular, Best Value"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingPlan ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Plan</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{editingPlan?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default PremiumPlansManage;
