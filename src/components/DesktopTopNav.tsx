import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Gamepad2, ShoppingBag, User, Settings, Wallet, History, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/app-logo.png";

// Desktop-only (lg+) game-shop style top navigation. Mobile keeps BottomNav.
const DesktopTopNav = () => {
  const { user, session } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const hidden = location.pathname.startsWith("/auth");

  useEffect(() => {
    if (!user || !session) { setIsAdmin(false); return; }
    let c = false;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => { if (!c) setIsAdmin(data === true); });
    return () => { c = true; };
  }, [user?.id, !!session]);

  useEffect(() => {
    document.body.classList.toggle("has-desktop-topnav", !hidden);
    return () => document.body.classList.remove("has-desktop-topnav");
  }, [hidden]);

  if (hidden) return null;

  const isShop = new URLSearchParams(location.search).get("view") === "shop";
  const items = [
    { to: "/", label: "Home", icon: Home, active: location.pathname === "/" },
    { to: "/game", label: "Games", icon: Gamepad2, active: location.pathname === "/game" && !isShop },
    { to: "/game?view=shop", label: "Shop", icon: ShoppingBag, active: location.pathname === "/game" && isShop },
    { to: "/order-history", label: "Orders", icon: History, active: location.pathname.startsWith("/order") },
    { to: "/topup", label: "Top Up", icon: Wallet, active: location.pathname.startsWith("/topup") },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60] hidden h-16 border-b border-border/60 bg-background/85 backdrop-blur-2xl lg:block">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-8 px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">Kaung <span className="text-primary">Digital Store</span></span>
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {items.map((i) => (
              <Link key={i.label} to={i.to} className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                i.active ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
                <i.icon className="h-4 w-4" />{i.label}
              </Link>
            ))}
          </nav>
          {user ? (
            <Link to={isAdmin ? "/admin" : "/account"} className={cn(
              "flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted",
              (location.pathname.startsWith("/admin") || location.pathname.startsWith("/account")) && "border-primary text-primary",
            )}>
              {isAdmin ? <Settings className="h-4 w-4" /> : <User className="h-4 w-4" />}{isAdmin ? "Admin" : "Account"}
            </Link>
          ) : (
            <Link to="/auth/login" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              <LogIn className="h-4 w-4" />Login
            </Link>
          )}
        </div>
      </header>
      <div className="hidden h-16 lg:block" aria-hidden />
    </>
  );
};

export default DesktopTopNav;
