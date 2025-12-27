import { useEffect, useState } from "react";
import { Home, Image, Heart, User, Settings, Gamepad2, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkAdmin();
      loadCartCount();

      // Real-time cart updates
      const channel = supabase
        .channel("bottom-nav-cart")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cart_items",
            filter: `user_id=eq.${user.id}`,
          },
          () => loadCartCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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

  const loadCartCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setCartCount(count || 0);
  };

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/photo", icon: Image, label: "Photo" },
    { to: "/game", icon: Gamepad2, label: "Shop" },
    { to: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount },
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
                    
                    {/* Cart badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-accent text-accent-foreground animate-scale-in">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                    
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