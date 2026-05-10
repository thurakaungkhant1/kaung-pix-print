import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Item {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  prompt: string;
  category: string | null;
  display_order: number;
  is_active: boolean;
}

const empty = {
  title: "",
  description: "",
  thumbnail_url: "",
  prompt: "",
  category: "general",
  display_order: 0,
  is_active: true,
};

const PopularPromptsManage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<typeof empty>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("popular_prompts")
      .select("*")
      .order("display_order", { ascending: true });
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: Item) => {
    setEditing(p.id);
    setDraft({
      title: p.title,
      description: p.description ?? "",
      thumbnail_url: p.thumbnail_url,
      prompt: p.prompt,
      category: p.category ?? "general",
      display_order: p.display_order,
      is_active: p.is_active,
    });
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.prompt.trim() || !draft.thumbnail_url.trim()) {
      toast.error("Title, thumbnail URL and prompt are required");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      thumbnail_url: draft.thumbnail_url.trim(),
      prompt: draft.prompt.trim(),
      category: draft.category.trim() || "general",
      display_order: draft.display_order || 0,
      is_active: draft.is_active,
    };
    const op =
      editing === "new"
        ? supabase.from("popular_prompts").insert(payload)
        : supabase.from("popular_prompts").update(payload).eq("id", editing!);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success(editing === "new" ? "Created" : "Updated");
    setEditing(null);
    setDraft(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    const { error } = await supabase.from("popular_prompts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/admin" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold flex-1">Popular Prompts</h1>
          <Button
            size="sm"
            onClick={() => {
              setEditing("new");
              setDraft(empty);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {editing && (
          <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">
                {editing === "new" ? "New prompt" : "Edit prompt"}
              </h2>
              <button onClick={() => setEditing(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              placeholder="Short description (optional)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <Input
              placeholder="Thumbnail image URL (https://...)"
              value={draft.thumbnail_url}
              onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })}
            />
            {draft.thumbnail_url && (
              <img
                src={draft.thumbnail_url}
                alt=""
                className="w-24 h-32 object-cover rounded-lg border border-border"
              />
            )}
            <Textarea
              placeholder="The full AI prompt (users will copy this exactly)"
              rows={5}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                placeholder="Category"
                className="w-32"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Order"
                className="w-20"
                value={draft.display_order}
                onChange={(e) =>
                  setDraft({ ...draft, display_order: parseInt(e.target.value) || 0 })
                }
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <Button onClick={save} className="ml-auto">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No prompts yet.</p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-3 flex gap-3">
              <img
                src={p.thumbnail_url}
                alt={p.title}
                className="w-16 h-20 object-cover rounded-md flex-shrink-0 bg-muted"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                  {!p.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/80 line-clamp-2">{p.prompt}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {p.category} • #{p.display_order}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PopularPromptsManage;
