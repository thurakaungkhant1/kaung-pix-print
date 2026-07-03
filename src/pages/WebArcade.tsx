import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Sparkles, Gamepad2, Flame, Clock, Heart } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WEB_ARCADE_GAMES,
  WEB_ARCADE_CATEGORIES,
  getGameThumb,
  findGame,
} from "@/lib/webArcadeGames";
import { getFavorites, getHistory } from "@/lib/webArcadeLocal";

const WebArcade = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [recent, setRecent] = useState(() =>
    getHistory().map((h) => findGame(h.slug)).filter(Boolean) as typeof WEB_ARCADE_GAMES
  );
  const [favorites, setFavorites] = useState(() =>
    getFavorites().map((s) => findGame(s)).filter(Boolean) as typeof WEB_ARCADE_GAMES
  );

  useEffect(() => {
    const refresh = () => {
      setRecent(getHistory().map((h) => findGame(h.slug)).filter(Boolean) as typeof WEB_ARCADE_GAMES);
      setFavorites(getFavorites().map((s) => findGame(s)).filter(Boolean) as typeof WEB_ARCADE_GAMES);
    };
    window.addEventListener("webArcadeHistoryUpdate", refresh);
    window.addEventListener("webArcadeFavoritesUpdate", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("webArcadeHistoryUpdate", refresh);
      window.removeEventListener("webArcadeFavoritesUpdate", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WEB_ARCADE_GAMES.filter(
      (g) =>
        (category === "All" || g.category === category) &&
        (!q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
    );
  }, [query, category]);

  const featured = WEB_ARCADE_GAMES.slice(0, 5);
  const showSections = !query && category === "All";

  return (
    <MobileLayout className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Web Arcade
            </h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">
              Instant online games · No download
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 rounded-full bg-muted/40 border-border/40"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {WEB_ARCADE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition",
                category === c
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        {/* Recently played */}
        {showSections && recent.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-display font-bold">Recently Played</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
              {recent.slice(0, 12).map((g) => (
                <button
                  key={g.slug}
                  onClick={() => navigate(`/web-arcade/play/${g.slug}`)}
                  className="relative flex-shrink-0 w-28 rounded-2xl overflow-hidden border border-border/60 hover:shadow-lg transition"
                >
                  <div className={cn("aspect-square bg-gradient-to-br relative", g.gradient)}>
                    <img src={getGameThumb(g.slug)} alt={g.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <p className="absolute inset-x-1.5 bottom-1.5 text-[10px] font-bold text-white line-clamp-1 drop-shadow">{g.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {showSections && favorites.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <h2 className="text-sm font-display font-bold">My Favorites</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
              {favorites.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => navigate(`/web-arcade/play/${g.slug}`)}
                  className="relative flex-shrink-0 w-28 rounded-2xl overflow-hidden border border-rose-300/50 hover:shadow-lg transition"
                >
                  <div className={cn("aspect-square bg-gradient-to-br relative", g.gradient)}>
                    <img src={getGameThumb(g.slug)} alt={g.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <Heart className="absolute top-1.5 right-1.5 h-3.5 w-3.5 fill-rose-500 text-rose-500 drop-shadow" />
                    <p className="absolute inset-x-1.5 bottom-1.5 text-[10px] font-bold text-white line-clamp-1 drop-shadow">{g.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Featured strip */}
        {showSections && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-display font-bold">Trending Now</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
              {featured.map((g, i) => (
                <motion.button
                  key={g.slug}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/web-arcade/play/${g.slug}`)}
                  className="relative flex-shrink-0 w-44 rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-xl transition"
                >
                  <div className={cn("aspect-[4/5] bg-gradient-to-br relative", g.gradient)}>
                    <img
                      src={getGameThumb(g.slug)}
                      alt={g.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget.style.display = "none"))}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-2 left-2 bg-orange-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5" /> HOT
                    </div>
                    <div className="absolute inset-x-2 bottom-2">
                      <p className="text-white text-sm font-bold drop-shadow line-clamp-1">{g.name}</p>
                      <p className="text-white/80 text-[10px]">{g.category}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* All games grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-display font-bold flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4 text-primary" />
              {category === "All" ? "All Games" : category}
            </h2>
            <Badge variant="secondary" className="text-[10px]">
              {filtered.length}
            </Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No games found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((g, i) => (
                <motion.button
                  key={g.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate(`/web-arcade/play/${g.slug}`)}
                  className="text-left rounded-2xl overflow-hidden bg-card border border-border/60 hover:shadow-lg hover:border-primary/30 transition group"
                >
                  <div className={cn("aspect-square bg-gradient-to-br relative", g.gradient)}>
                    <img
                      src={getGameThumb(g.slug)}
                      alt={g.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget.style.display = "none"))}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-2 right-2 text-2xl drop-shadow-lg">{g.emoji}</div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold line-clamp-1">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">{g.category}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-[10px] text-muted-foreground/60 pt-2">
          Games powered by e.tubhai.com
        </p>
      </main>
    </MobileLayout>
  );
};

export default WebArcade;
