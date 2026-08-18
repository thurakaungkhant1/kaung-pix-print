import { useEffect, useState } from "react";
import { Home, User, Settings, ShoppingBag, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSupportUnread } from "@/hooks/useSupportUnread";

const BottomNav = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { unread: supportUnread } = useSupportUnread();

  useEffect(() => {
    let cancelled = false;
    if (!user || !session) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(data === true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, !!session]);


  const navItems: { to: string; icon: any; label: string; badge?: number }[] = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/game", icon: Gamepad2, label: "Game" },
    { to: "/game?view=shop", icon: ShoppingBag, label: "Shop" },
    {
      to: isAdmin ? "/admin" : "/account",
      icon: isAdmin ? Settings : User,
      label: isAdmin ? "Admin" : "Account",
      badge: isAdmin ? 0 : supportUnread,
    },
  ];

  const isShopView = new URLSearchParams(location.search).get("view") === "shop";
  const isItemActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/game") return location.pathname === "/game" && !isShopView;
    if (to === "/game?view=shop") return location.pathname === "/game" && isShopView;
    return location.pathname.startsWith(to);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-[420px] lg:max-w-[560px]",
        "rounded-[1.75rem] border border-border/60",
        "bg-background/80 backdrop-blur-2xl",
        "shadow-[0_12px_30px_rgba(0,0,0,0.25)]",
        "px-2 py-1.5",
      )}
    >
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = isItemActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 items-center justify-center py-1.5 px-2 group"
            >
              {isActive && (
                <motion.span
                  layoutId="bottomnav-pill"
                  className={cn(
                    "absolute inset-x-1 inset-y-0.5 rounded-[1.25rem]",
                    "bg-primary shadow-md",
                  )}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <motion.div
                className="relative z-10 flex flex-col items-center"
                whileTap={{ scale: 0.92 }}
              >
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold ring-2 ring-background">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] mb-0.5 transition-colors duration-300",
                    isActive
                      ? "text-primary-foreground stroke-[2.25]"
                      : "text-muted-foreground group-hover:text-foreground stroke-[2]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider transition-colors duration-300",
                    isActive
                      ? "font-bold text-primary-foreground"
                      : "font-semibold text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
