import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Gem, Download, Upload } from "lucide-react";
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
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const CSV_HEADERS = [
    "name",
    "description",
    "price",
    "cost_price",
    "points_value",
    "image_url",
    "smile_package_id",
  ];

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExport = () => {
    if (packages.length === 0) {
      toast({ title: "Nothing to export", description: "No packages found", variant: "destructive" });
      return;
    }
    const rows = packages.map((p: any) =>
      [
        p.name,
        p.description ?? "",
        p.price,
        p.cost_price ?? 0,
        p.points_value ?? 0,
        p.image_url,
        p.smile_package_id ?? "",
      ]
        .map(esc)
        .join(",")
    );
    const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${category}-packages.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${packages.length} packages exported` });
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((f) => f.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
    return rows;
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("CSV is empty");
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (k: string) => headers.indexOf(k);
      if (idx("name") === -1 || idx("price") === -1)
        throw new Error("CSV must include at least 'name' and 'price' columns");

      const existingByName = new Map(packages.map((p) => [p.name.trim().toLowerCase(), p.id]));
      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const r of rows.slice(1)) {
        const get = (k: string) => (idx(k) === -1 ? "" : (r[idx(k)] ?? "").trim());
        const name = get("name");
        const price = Number(get("price"));
        if (!name || !isFinite(price) || price <= 0) {
          errors.push(name || "(unnamed)");
          continue;
        }
        const payload: Record<string, any> = {
          name,
          description: get("description") || null,
          price,
          cost_price: Number(get("cost_price")) || 0,
          points_value: Number(get("points_value")) || 0,
          image_url: get("image_url") || "/placeholder.svg",
          smile_package_id: get("smile_package_id") || null,
          category,
        };
        const existingId = existingByName.get(name.toLowerCase());
        const { error } = existingId
          ? await supabase.from("products").update(payload).eq("id", existingId)
          : await supabase.from("products").insert(payload as any);
        if (error) errors.push(`${name}: ${error.message}`);
        else existingId ? updated++ : created++;
      }

      toast({
        title: "Import finished",
        description: `${created} added, ${updated} updated${errors.length ? `, ${errors.length} failed` : ""}`,
        variant: errors.length ? "destructive" : undefined,
      });
      loadPackages();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
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
            <div className="flex flex-wrap justify-between items-center gap-3">
              <CardTitle className="text-base">Manage {gameName} packages</CardTitle>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                  }}
                />
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? "Importing..." : "Import CSV"}
                </Button>
                <Button onClick={() => navigate(newPath)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </div>
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
