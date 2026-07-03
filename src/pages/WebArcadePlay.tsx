import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Heart, Loader2, Maximize2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { findGame, getGameEmbedUrl } from "@/lib/webArcadeGames";
import {
  awardArcadeCoins,
  isFavorite,
  recordPlay,
  toggleFavorite,
} from "@/lib/webArcadeLocal";
import { cn } from "@/lib/utils";

const WebArcadePlay = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const game = findGame(slug);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setLoading(true);
  }, [slug, reloadKey]);

  useEffect(() => {
    if (!game) return;
    setFav(isFavorite(slug));
    recordPlay(slug);
    // Award coins once per day, silently in background
    awardArcadeCoins(slug).then((pts) => {
      if (pts > 0) {
        toast({
          title: `+${pts} coins earned! 🎉`,
          description: `Daily reward for playing ${game.name}`,
        });
      }
    });
  }, [slug, game]);

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-semibold">Game not found</p>
        <Button onClick={() => navigate("/web-arcade")}>Back to Web Arcade</Button>
      </div>
    );
  }

  const embedUrl = getGameEmbedUrl(slug);

  const openFullscreen = () => {
    const el = document.getElementById("web-arcade-frame") as HTMLIFrameElement | null;
    if (el?.requestFullscreen) el.requestFullscreen();
  };

  const handleToggleFav = () => {
    const now = toggleFavorite(slug);
    setFav(now);
    toast({
      title: now ? "Added to favorites ❤️" : "Removed from favorites",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate("/web-arcade")}
          className="p-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{game.name}</p>
          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            {game.category} · +5 coins/day
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleToggleFav}
          aria-label="Favorite"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-rose-500 text-rose-500")} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setReloadKey((k) => k + 1)}
          aria-label="Reload"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={openFullscreen} aria-label="Fullscreen">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => window.open(embedUrl, "_blank", "noopener,noreferrer")}
          aria-label="Open externally"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </header>

      {/* Game frame */}
      <div className="relative flex-1 bg-black">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading {game.name}…</p>
          </div>
        )}
        <iframe
          id="web-arcade-frame"
          key={reloadKey}
          src={embedUrl}
          title={game.name}
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write"
          allowFullScreen
          onLoad={() => setLoading(false)}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
};

export default WebArcadePlay;
