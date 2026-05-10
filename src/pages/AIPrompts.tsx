import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Copy, Check, Wand2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

interface PopularPrompt {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  prompt: string;
  category: string | null;
}

const AIPrompts = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PopularPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("popular_prompts")
        .select("id, title, description, thumbnail_url, prompt, category")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setItems((data as PopularPrompt[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = items.filter((i) => {
    const matchesCat = activeCat === "all" || i.category === activeCat;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || i.title.toLowerCase().includes(q) || i.prompt.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const copy = async (p: PopularPrompt) => {
    try {
      await navigator.clipboard.writeText(p.prompt);
      setCopiedId(p.id);
      toast.success("Prompt copied!");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const useInGenerator = (p: PopularPrompt) => {
    sessionStorage.setItem("ai_prefill_prompt", p.prompt);
    navigate("/ai/photo");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h1 className="font-semibold">Popular Prompts</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 max-w-md mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts..."
            className="pl-9 h-10 rounded-full"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  activeCat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No prompts found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col"
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  <img
                    src={p.thumbnail_url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-2.5 space-y-2 flex-1 flex flex-col">
                  <div className="flex-1">
                    <p className="text-xs font-semibold leading-snug line-clamp-1">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{p.prompt}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-[10px] px-1"
                      onClick={() => copy(p)}
                    >
                      {copiedId === p.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-[10px] px-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      onClick={() => useInGenerator(p)}
                    >
                      <Wand2 className="w-3 h-3 mr-1" /> Use
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AIPrompts;
