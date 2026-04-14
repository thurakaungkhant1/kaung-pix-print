import { useEffect, useState } from "react";
import { Home, Gamepad2, Heart, User, Settings, ShoppingBag, Wallet } from "lucide-react";
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
    { to: "/games", icon: Gamepad2, label: "Games" },
    { to: "/favourite", icon: Heart, label: "Saves" },
    { 
      to: isAdmin ? "/admin" : "/account", 
      icon: isAdmin ? Settings : User, 
      label: isAdmin ? "Admin" : "Me" 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl",
                "text-muted-foreground transition-all duration-200",
              )}
              activeClassName="text-primary"
            >
              {({ isActive }) => (
                <motion.div 
                  className="flex flex-col items-center gap-0.5"
                  whileTap={{ scale: 0.9 }}
                >
                  <div className={cn(
                    "relative p-2 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "stroke-[2.5] text-primary" : "stroke-[1.5]"
                    )} />
                    {isActive && (
                      <motion.div 
                        layoutId="bottomnav-glow"
                        className="absolute inset-0 rounded-xl bg-primary/15 blur-md"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold text-primary"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="h-safe-area-inset-bottom bg-background/80" />
    </nav>
  );
};

export default BottomNav;
