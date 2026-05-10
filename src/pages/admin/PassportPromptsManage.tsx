import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Preset {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
}

const empty = { name: "", description: "", prompt: "", thumbnail_url: "", display_order: 0, is_active: true };

const PassportPromptsManage = () => {
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<typeof empty>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("passport_photo_prompts")
      .select("*")
      .order("display_order", { ascending: true });
    setItems((data as Preset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (p: Preset) => {
    setEditing(p.id);
    setDraft({
      name: p.name,
      description: p.description ?? "",
      prompt: p.prompt,
      thumbnail_url: p.thumbnail_url ?? "",
      display_order: p.display_order,
      is_active: p.is_active,
    });
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.prompt.trim()) {
      toast.error("Name and prompt required");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      prompt: draft.prompt.trim(),
      thumbnail_url: draft.thumbnail_url.trim() || null,
      display_order: draft.display_order || 0,
      is_active: draft.is_active,
    };
    if (editing === "new") {
      const { error } = await supabase.from("passport_photo_prompts").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Created");
    } else if (editing) {
      const { error } = await supabase
        .from("passport_photo_prompts")
        .update(payload)
        .eq("id", editing);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    }
    setEditing(null);
    setDraft(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this preset?")) return;
    const { error } = await supabase.from("passport_photo_prompts").delete().eq("id", id);
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
          <h1 className="font-semibold flex-1">Passport Photo Prompts</h1>
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
                {editing === "new" ? "New preset" : "Edit preset"}
              </h2>
              <button onClick={() => setEditing(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Preset name (e.g. White Background)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              placeholder="Short description"
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
                className="w-20 h-28 object-cover rounded-lg border border-border"
              />
            )}
            <Textarea
              placeholder="AI prompt — describe exactly how the passport photo should look"
              rows={6}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
            />
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Order"
                className="w-24"
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
          <p className="text-sm text-muted-foreground text-center py-8">No presets yet.</p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                {p.thumbnail_url && (
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    className="w-14 h-18 object-cover rounded-md flex-shrink-0 bg-muted"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    {!p.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        inactive
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">#{p.display_order}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mb-1">{p.description}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/80 line-clamp-3">{p.prompt}</p>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PassportPromptsManage;
