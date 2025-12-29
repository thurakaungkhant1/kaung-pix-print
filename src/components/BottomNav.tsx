import { useEffect, useState } from "react";
import { Home, Image, Heart, User, Settings, Gamepad2, Wallet } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdmin();
    }
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/game", icon: Gamepad2, label: "Shop" },
    { to: "/favourite", icon: Heart, label: "Favorites" },
    { to: "/top-up", icon: Wallet, label: "Wallet" },
    { 
      to: isAdmin ? "/admin" : "/account", 
      icon: isAdmin ? Settings : User, 
      label: isAdmin ? "Admin" : "Account" 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around items-center h-18 py-2">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-2xl",
                "text-muted-foreground transition-all duration-300 ease-smooth",
                "hover:text-primary hover:bg-primary/5",
                "active:scale-95"
              )}
              activeClassName="text-primary bg-primary/10"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center gap-1">
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-scale-in" />
                  )}
                  
                  <div className={cn(
                    "relative p-2 rounded-xl transition-all duration-300",
                    isActive && "bg-primary/15"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? "stroke-[2.5] text-primary" : "stroke-[1.5]"
                    )} />
                    
                    {/* Glow effect */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg animate-pulse-soft" />
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-[10px] font-medium transition-all duration-300",
                    isActive && "font-semibold text-primary"
                  )}>
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      
      {/* Bottom safe area */}
      <div className="h-safe-area-inset-bottom bg-background/80" />
    </nav>
  );
};

export default BottomNav;