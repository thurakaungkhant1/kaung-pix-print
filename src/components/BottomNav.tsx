import { useEffect, useState } from "react";
import { Home, Image, Heart, User, Settings, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdmin();
      loadCartCount();
      
      // Subscribe to cart changes
      const channel = supabase
        .channel("cart-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cart_items",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadCartCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setCartCount(0);
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
    { to: "/favourite", icon: Heart, label: "Favourite" },
    { to: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount },
    { 
      to: isAdmin ? "/admin" : "/account", 
      icon: isAdmin ? Settings : User, 
      label: isAdmin ? "Admin" : "Account" 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-primary/20 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center flex-1 h-full text-primary-foreground/70 hover:text-primary-foreground transition-colors relative"
              activeClassName="text-primary-foreground bg-nav-active/20"
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5]")} />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
