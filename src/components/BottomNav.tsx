import { useEffect, useState } from "react";
import { Home, User, Settings, ShoppingBag } from "lucide-react";
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
    {
      to: isAdmin ? "/admin" : "/account",
      icon: isAdmin ? Settings : User,
      label: isAdmin ? "Admin" : "Account",
    },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-[420px]",
        "rounded-[1.75rem] border border-border/60",
        "bg-background/80 backdrop-blur-2xl",
        "shadow-[0_12px_30px_rgba(0,0,0,0.25)]",
        "px-2 py-1.5",
      )}
    >
      <div className="flex items-center justify-between">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="relative flex flex-1 items-center justify-center py-1.5 px-2 group"
          >
            {({ isActive }) => (
              <>
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
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
