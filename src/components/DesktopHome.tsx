import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, ChevronLeft, Wallet, Receipt, Sparkles, Zap, ShieldCheck, Headphones,
  BadgePercent, Gamepad2, UserCheck, CreditCard, PackageCheck, ArrowRight, ShoppingBag,
  Smartphone, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/desktop-hero.jpg";
import type { GameCatalogItem } from "@/hooks/useGameCatalog";
import MlbbEventsSection from "@/components/mlbb/MlbbEventsSection";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  badge_text: string | null;
  link_url: string;
  link_text: string;
}

interface Props {
  games: GameCatalogItem[];
  gamesLoading: boolean;
  gamesError: string | null;
  reloadGames: () => void;
  banners: Banner[];
  bannerBackground: (b: Banner) => string;
  walletBalance: number;
  totalCoins: number;
  signedIn: boolean;
}

const TRUST = [
  { icon: Zap, title: "Instant Delivery", text: "Most top-ups arrive in seconds" },
  { icon: ShieldCheck, title: "Secure Payment", text: "Wallet protected purchases" },
  { icon: BadgePercent, title: "Best Prices", text: "Fair rates in Myanmar Kyat" },
  { icon: Headphones, title: "24/7 Support", text: "Real people ready to help" },
];

const STEPS = [
  { icon: Gamepad2, title: "Choose your game", text: "Pick from 200+ supported games." },
  { icon: UserCheck, title: "Enter player ID", text: "We confirm your in-game name first." },
  { icon: CreditCard, title: "Pay with wallet", text: "Top up your wallet with KPay or WavePay." },
  { icon: PackageCheck, title: "Receive instantly", text: "Diamonds and UC land in your account." },
];

const SectionTitle = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div className="flex items-center gap-3">
      <span className="h-9 w-1.5 rounded-full bg-primary" />
      <div>
        <h2 className="text-2xl font-display font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const DesktopHome = ({
  games, gamesLoading, gamesError, reloadGames, banners, bannerBackground, walletBalance, totalCoins, signedIn,
}: Props) => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const slides = banners.length;

  useEffect(() => {
    if (slides <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides), 5000);
    return () => clearInterval(t);
  }, [slides]);

  const popular = games.slice(0, 12);
  const current = slides ? banners[slide % slides] : null;

  const renderTile = (g: GameCatalogItem) => (
                  <button
                    key={g.category_key}
                    onClick={() => navigate(`/game?g=${encodeURIComponent(g.category_key)}`)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-muted">
                      <img src={g.image_url || "/images/games/mobile-legends.png"} alt={g.name} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-nav via-nav/85 to-transparent p-3 pt-10 text-nav-foreground">
                      <p className="truncate text-sm font-bold">{g.short_name || g.name}</p>
                      <p className="flex items-center gap-1 text-[11px] text-nav-muted"><Zap className="h-3 w-3 text-nav-active" /> Instant top-up</p>
                    </div>
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Top Up
                    </span>
                  </button>
  );

  return (
    <div className="hidden lg:block">
      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-8 pt-8">
        <div className="relative col-span-8 min-h-[340px] overflow-hidden rounded-3xl bg-nav text-nav-foreground shadow-xl">
          <img src={heroImage} alt="" width={1600} height={640} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-nav via-nav/80 to-transparent" />
          {current && (
            <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: bannerBackground(current) }} />
          )}
          <div className="relative flex h-full flex-col justify-center gap-4 p-10 max-w-xl">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-highlight px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-highlight-foreground">
              <Sparkles className="h-3.5 w-3.5" /> {current?.badge_text || "Official Top-Up Partner"}
            </span>
            <h1 className="text-4xl font-display font-black leading-[1.1] tracking-tight xl:text-5xl">
              {current?.title || "Top up your favourite games in seconds"}
            </h1>
            <p className="text-base text-nav-muted line-clamp-2">
              {current?.description || "Mobile Legends diamonds, PUBG UC and 200+ more games — fast, secure and priced in MMK."}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate(current?.link_url || "/game?g=")}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-bold text-primary-foreground shadow-lg hover:bg-accent transition-colors"
              >
                {current?.link_text || "Top Up Now"} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/game?g=")}
                className="inline-flex h-12 items-center rounded-full border border-nav-foreground/25 px-6 text-sm font-semibold hover:bg-nav-foreground/10 transition-colors"
              >
                Browse all games
              </button>
            </div>
          </div>
          {slides > 1 && (
            <div className="absolute bottom-5 right-6 flex items-center gap-2">
              <button aria-label="Previous" onClick={() => setSlide((s) => (s - 1 + slides) % slides)} className="flex h-9 w-9 items-center justify-center rounded-full bg-nav-foreground/15 hover:bg-nav-foreground/25">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {banners.map((b, i) => (
                <button key={b.id} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)}
                  className={cn("h-2 rounded-full transition-all", i === slide ? "w-7 bg-nav-active" : "w-2 bg-nav-foreground/40")} />
              ))}
              <button aria-label="Next" onClick={() => setSlide((s) => (s + 1) % slides)} className="flex h-9 w-9 items-center justify-center rounded-full bg-nav-foreground/15 hover:bg-nav-foreground/25">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Wallet panel */}
        <aside className="col-span-4 flex flex-col gap-4">
          <div className="relative flex-1 overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl" style={{ background: "var(--gradient-primary)" }}>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">My Wallet</p>
                <button onClick={() => navigate("/games")} className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-highlight" /> {totalCoins.toLocaleString()} coins
                </button>
              </div>
              <p className="mt-4 text-4xl font-display font-black tabular-nums tracking-tight">
                {Math.round(walletBalance).toLocaleString()} <span className="text-lg font-bold text-primary-foreground/75">MMK</span>
              </p>
              <div className="mt-6 grid grid-cols-[1fr_1fr] gap-2">
                <button onClick={() => navigate(signedIn ? "/top-up" : "/auth/login")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-foreground text-sm font-bold text-primary">
                  <Wallet className="h-4 w-4" /> Top Up
                </button>
                <button onClick={() => navigate("/wallet-history")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 text-sm font-bold">
                  <Receipt className="h-4 w-4" /> History
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <button onClick={() => navigate("/orders")} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition">
              <PackageCheck className="h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-bold">My Orders</p>
              <p className="text-xs text-muted-foreground">Track delivery</p>
            </button>
            <button onClick={() => navigate("/game?view=shop")} className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <p className="mt-2 text-sm font-bold">Digital Shop</p>
              <p className="text-xs text-muted-foreground">Gift cards & more</p>
            </button>
          </div>
        </aside>
      </section>

      {/* ── Trust strip ── */}
      <section className="mx-auto mt-6 max-w-7xl px-8">
        <div className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card shadow-sm">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 px-6 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <t.icon className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-sm font-bold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular games ── */}
      <section className="mx-auto mt-12 max-w-7xl px-8">
        <SectionTitle
          title="Popular Games"
          subtitle="Instant top-up at official rates"
          action={
            <button onClick={() => navigate("/game?g=")} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-5 text-sm font-semibold text-primary hover:bg-primary/10 transition">
              View all {games.length > 0 ? `${games.length} games` : "games"} <ChevronRight className="h-4 w-4" />
            </button>
          }
        />
        {gamesError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Couldn't load the game list.</p>
            <button onClick={reloadGames} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-5">
            {gamesLoading && popular.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-[4/5] animate-pulse bg-muted" />
                  </div>
                ))
              : popular.slice(0, 6).map(renderTile)}
          </div>
        )}
      </section>

      {/* ── MLBB events (after the first Popular Games row) ── */}
      <MlbbEventsSection variant="desktop" />

      {!gamesError && popular.length > 6 && (
        <section className="mx-auto mt-10 max-w-7xl px-8" aria-label="More popular games">
          <div className="grid grid-cols-6 gap-5">{popular.slice(6).map(renderTile)}</div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="mx-auto mt-14 max-w-7xl px-8">
        <SectionTitle title="How to Top Up" subtitle="Four simple steps — done in under a minute" />
        <div className="grid grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="absolute right-5 top-4 text-5xl font-display font-black text-primary/10">{i + 1}</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <s.icon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── More services ── */}
      <section className="mx-auto mt-14 grid max-w-7xl grid-cols-3 gap-5 px-8">
        <button onClick={() => navigate("/game?view=shop")} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Smartphone className="h-7 w-7 text-primary" /></span>
          <div className="flex-1">
            <p className="text-base font-bold">Phone & Data Top-Up</p>
            <p className="text-sm text-muted-foreground">Mobile bills and data plans</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </button>
        <button onClick={() => navigate("/game?view=shop")} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:border-primary/40 hover:shadow-md transition">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><ShoppingBag className="h-7 w-7 text-primary" /></span>
          <div className="flex-1">
            <p className="text-base font-bold">Digital Products</p>
            <p className="text-sm text-muted-foreground">Gift cards and subscriptions</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </button>
        <button onClick={() => navigate("/games")} className="group flex items-center gap-4 rounded-2xl border border-highlight/40 bg-highlight/10 p-6 text-left shadow-sm hover:shadow-md transition">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-highlight"><Trophy className="h-7 w-7 text-highlight-foreground" /></span>
          <div className="flex-1">
            <p className="text-base font-bold">Earn Free Coins</p>
            <p className="text-sm text-muted-foreground">Play mini games, collect rewards</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
        </button>
      </section>
    </div>
  );
};

export default DesktopHome;
