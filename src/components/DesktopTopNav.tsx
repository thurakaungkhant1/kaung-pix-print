import { useEffect, useState, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Gamepad2, ShoppingBag, User, Settings, Wallet, History, LogIn, Search,
  Plus, Joystick, Headphones, ShieldCheck, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import logo from "@/assets/app-logo.png";

// Desktop-only (lg+) professional game top-up store header. Mobile keeps BottomNav.
const DesktopTopNav = () => {
  const { user, session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const hidden = location.pathname.startsWith("/auth");

  useEffect(() => {
    if (!user || !session) { setIsAdmin(false); return; }
    let c = false;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (!c) setIsAdmin(data === true); });
    return () => { c = true; };
  }, [user?.id, !!session]);

  // Wallet balance in the header (refreshed on navigation and live updates)
  useEffect(() => {
    if (!user) { setBalance(null); return; }
    let c = false;
    supabase.from("profiles").select("wallet_balance").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (!c && data) setBalance(Number(data.wallet_balance) || 0); });
    return () => { c = true; };
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("desktop-nav-wallet")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (p: any) => { if (p.new && p.new.wallet_balance != null) setBalance(Number(p.new.wallet_balance) || 0); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    document.body.classList.toggle("has-desktop-topnav", !hidden);
    return () => document.body.classList.remove("has-desktop-topnav");
  }, [hidden]);

  if (hidden) return null;

  const isShop = new URLSearchParams(location.search).get("view") === "shop";
  const items = [
    { to: "/", label: "Home", icon: Home, active: location.pathname === "/" },
    { to: "/game?g=", label: "Game Top-Up", icon: Gamepad2, active: location.pathname === "/game" && !isShop },
    { to: "/game?view=shop", label: "Shop", icon: ShoppingBag, active: location.pathname === "/game" && isShop },
    { to: "/orders", label: "My Orders", icon: History, active: location.pathname.startsWith("/orders") },
    { to: "/top-up", label: "Wallet Top-Up", icon: Wallet, active: location.pathname.startsWith("/top-up") },
    { to: "/games", label: "Mini Games", icon: Joystick, active: location.pathname.startsWith("/games") },
    { to: "/support", label: "Support", icon: Headphones, active: location.pathname.startsWith("/support") },
  ];

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(`/game?g=${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  };

  const accountActive = location.pathname.startsWith("/admin") || location.pathname.startsWith("/account");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] hidden lg:block shadow-lg">
        {/* Main bar */}
        <div className="bg-nav text-nav-foreground">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-8">
            <Link to="/" className="flex shrink-0 items-center gap-3">
              <img src={logo} alt="" className="h-10 w-10 rounded-xl bg-card object-cover" />
              <div className="leading-none">
                <span className="block text-lg font-display font-extrabold tracking-tight">Kaung <span className="text-nav-active">Digital</span></span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-nav-muted">Game Top-Up Store</span>
              </div>
            </Link>

            <form onSubmit={onSearch} className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-nav-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games — Mobile Legends, PUBG, Free Fire…"
                aria-label="Search games"
                className="h-11 w-full rounded-full border border-nav-foreground/15 bg-nav-foreground/10 pl-11 pr-24 text-sm text-nav-foreground placeholder:text-nav-muted outline-none transition focus:border-nav-active focus:bg-nav-foreground/15"
              />
              <button type="submit" className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-accent transition-colors">
                Search
              </button>
            </form>

            <div className="ml-auto flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/wallet-history" className="flex items-center gap-2.5 rounded-full border border-nav-foreground/15 bg-nav-foreground/5 py-1.5 pl-1.5 pr-4 hover:bg-nav-foreground/10 transition-colors">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <Wallet className="h-4 w-4 text-primary-foreground" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-nav-muted">Balance</span>
                      <span className="block text-sm font-bold tabular-nums">{(balance ?? 0).toLocaleString()} <span className="text-[10px] text-nav-muted">MMK</span></span>
                    </span>
                  </Link>
                  <Link to="/top-up" className="flex h-11 items-center gap-1.5 rounded-full bg-highlight px-5 text-sm font-bold text-highlight-foreground shadow-md hover:brightness-105 transition">
                    <Plus className="h-4 w-4" /> Top Up
                  </Link>
                  <NotificationBell className="h-11 w-11 rounded-full border border-nav-foreground/15 bg-nav-foreground/5 text-nav-foreground hover:bg-nav-foreground/10" />
                  <Link to={isAdmin ? "/admin" : "/account"} className={cn(
                    "flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                    accountActive ? "border-nav-active bg-nav-active/15 text-nav-foreground" : "border-nav-foreground/15 hover:bg-nav-foreground/10",
                  )}>
                    {isAdmin ? <Settings className="h-4 w-4" /> : <User className="h-4 w-4" />}{isAdmin ? "Admin" : "Account"}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth/signup" className="flex h-11 items-center rounded-full border border-nav-foreground/20 px-5 text-sm font-semibold hover:bg-nav-foreground/10 transition-colors">
                    Sign up
                  </Link>
                  <Link to="/auth/login" className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-accent transition-colors">
                    <LogIn className="h-4 w-4" />Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Category / section bar */}
        <div className="border-b border-border bg-card/95 backdrop-blur-xl">
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 px-8">
            <nav className="flex flex-1 items-center gap-1">
              {items.map((i) => (
                <Link key={i.label} to={i.to} className={cn(
                  "relative flex h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors",
                  i.active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}>
                  <i.icon className="h-4 w-4" />{i.label}
                  {i.active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-primary" />}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Instant delivery</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure payment</span>
            </div>
          </div>
        </div>
      </header>
      <div className="hidden h-[6.75rem] lg:block" aria-hidden />
    </>
  );
};

export default DesktopTopNav;
