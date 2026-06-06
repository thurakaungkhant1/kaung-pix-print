import { useEffect, useState } from "react";
import { Home, ImageIcon, User, Settings, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    }
  }, [user]);

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/game", icon: ShoppingBag, label: "Shop" },
    { to: "/photo", icon: ImageIcon, label: "Gallery" },
    {
      to: isAdmin ? "/admin" : "/account",
      icon: isAdmin ? Settings : User,
      label: isAdmin ? "Admin" : "Account",
    },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-2xl border border-border/40 bg-background/70 backdrop-blur-2xl shadow-xl">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl",
                "text-muted-foreground transition-all duration-200 group",
              )}
              activeClassName="text-primary"
            >
              {({ isActive }) => (
                <motion.div
                  className="relative flex flex-col items-center gap-0.5"
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ y: -2 }}
                >
                  {/* Top indicator line for active */}
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-indicator"
                      className="absolute -top-3 h-1 w-8 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className={cn(
                    "relative p-2 rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-br from-primary/20 to-fuchsia-500/20"
                      : "group-hover:bg-muted/60",
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive
                        ? "stroke-[2.5] text-primary scale-110"
                        : "stroke-[1.75] group-hover:scale-110 group-hover:text-foreground",
                    )} />
                    {isActive && (
                      <motion.div
                        layoutId="bottomnav-glow"
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/40 to-fuchsia-500/40 blur-xl -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-all duration-200",
                    isActive
                      ? "font-bold text-primary"
                      : "group-hover:text-foreground",
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
