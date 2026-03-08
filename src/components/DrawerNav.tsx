import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Heart, User, Settings, Gamepad2, Wallet, Menu, X, Crown, ShoppingBag, Camera, History, ArrowRightLeft, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";

const DrawerNav = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const mainNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/game", icon: Gamepad2, label: "Game Shop" },
    { to: "/physical-products", icon: ShoppingBag, label: "Products" },
    { to: "/photo", icon: Camera, label: "Photo Gallery" },
    { to: "/favourite", icon: Heart, label: "Favorites" },
    { to: "/top-up", icon: Wallet, label: "Wallet & Top Up" },
  ];

  const secondaryNavItems = [
    { to: "/exchange", icon: ArrowRightLeft, label: "Exchange Points" },
    { to: "/transaction-history", icon: History, label: "Transaction History" },
    { to: "/contact", icon: Phone, label: "Contact Us" },
  ];

  const handleNavigate = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Fixed Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 max-w-screen-xl mx-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-3">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-background">
              {/* Drawer Header */}
              <div className="p-6 pb-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
                <h2 className="text-2xl font-display font-black text-foreground">
                  <span>Kaung </span>
                  <span className="text-primary">Computer</span>
                </h2>
                {user && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {user.email}
                  </p>
                )}
              </div>

              <Separator />

              {/* Main Navigation */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 space-y-1">
                  {mainNavItems.map((item) => (
                    <button
                      key={item.to}
                      onClick={() => handleNavigate(item.to)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive(item.to) ? "text-primary" : ""
                      )} />
                      {item.label}
                      {isActive(item.to) && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="px-3 space-y-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                    More
                  </p>
                  {secondaryNavItems.map((item) => (
                    <button
                      key={item.to}
                      onClick={() => handleNavigate(item.to)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Account / Admin */}
                <div className="px-3 space-y-1">
                  <button
                    onClick={() => handleNavigate("/account")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive("/account")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <User className="h-5 w-5 flex-shrink-0" />
                    Account
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleNavigate("/admin")}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive("/admin")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Settings className="h-5 w-5 flex-shrink-0" />
                      Admin Panel
                    </button>
                  )}
                </div>
              </nav>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border/50 flex items-center justify-end">
                <p className="text-xs text-muted-foreground/50">v1.0</p>
              </div>
            </SheetContent>
          </Sheet>

          {/* Brand */}
          <h1
            className="text-lg font-display font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span>Kaung </span>
            <span className="text-primary">Computer</span>
          </h1>

          <div className="ml-auto" />

        </div>
      </header>
    </>
  );
};

export default DrawerNav;
