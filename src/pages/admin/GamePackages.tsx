import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Gem } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GamePackage {
  id: number;
  name: string;
  price: number;
  cost_price: number | null;
  image_url: string;
  description: string | null;
  category: string;
  smile_package_id: string | null;
  created_at: string;
}

const GamePackages = () => {
  const { categoryKey = "" } = useParams();
  const category = decodeURIComponent(categoryKey);
  const [packages, setPackages] = useState<GamePackage[]>([]);
  const [gameName, setGameName] = useState(category);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadGame();
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const loadGame = async () => {
    const { data } = await (supabase as any)
      .from("game_catalog")
      .select("name")
      .eq("category_key", category)
      .maybeSingle();
    if (data?.name) setGameName(data.name);
  };

  const loadPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .order("price", { ascending: true });

    if (error) {
      toast({ title: "Error loading packages", description: error.message, variant: "destructive" });
    } else {
      setPackages((data || []) as GamePackage[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting package", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Package deleted", description: "The package has been removed" });
      loadPackages();
    }
  };

  const newPath = `/admin/game-packages/${encodeURIComponent(category)}/new`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/game-catalog")}
            className="hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Gem className="h-6 w-6 shrink-0" />
            <h1 className="text-xl font-bold truncate">{gameName} Packages</h1>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center gap-3">
              <CardTitle className="text-base">Manage {gameName} packages</CardTitle>
              <Button onClick={() => navigate(newPath)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12">
                <Gem className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No packages yet</p>
                <Button onClick={() => navigate(newPath)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Package
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Smile.One ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{pkg.name}</div>
                            {pkg.description && (
                              <div className="text-sm text-muted-foreground truncate">
                                {pkg.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pkg.price.toLocaleString()} Ks</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pkg.cost_price ? `${pkg.cost_price.toLocaleString()} Ks` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pkg.smile_package_id || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/admin/game-packages/${encodeURIComponent(category)}/edit/${pkg.id}`
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Package</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{pkg.name}"? This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(pkg.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamePackages;
