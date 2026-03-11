import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Heart, User, Settings, Gamepad2, Wallet, Menu, ShoppingBag, Camera, History, ArrowRightLeft, Phone, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

const DrawerNav = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null; points: number } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      checkAdmin();
      loadProfile();
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

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar_url, points")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
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

  const navItemVariants = {
    hidden: { opacity: 0, x: -16 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.03, duration: 0.3, ease: "easeOut" as const },
    }),
  };

  return (
    <>
      {/* Fixed Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center px-4 max-w-screen-xl mx-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-3 hover:bg-primary/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 bg-background border-r border-border/30">
              {/* Profile Header */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                
                <div className="relative p-6 pt-8">
                  {user && profile ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{profile.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-primary">{profile.points} pts</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-display font-black text-foreground">
                        <span>Kaung </span>
                        <span className="text-primary">Computer</span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">Welcome back!</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Main Navigation */}
              <nav className="flex-1 overflow-y-auto py-3">
                <div className="px-3 space-y-0.5">
                  <AnimatePresence>
                    {mainNavItems.map((item, i) => (
                      <motion.button
                        key={item.to}
                        custom={i}
                        variants={navItemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleNavigate(item.to)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                          isActive(item.to)
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                          isActive(item.to)
                            ? "bg-primary-foreground/20"
                            : "bg-muted group-hover:bg-background"
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive(item.to) && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="w-1.5 h-1.5 rounded-full bg-primary-foreground"
                          />
                        )}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="px-6 py-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                <div className="px-3 space-y-0.5">
                  <p className="px-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] mb-2">
                    More
                  </p>
                  {secondaryNavItems.map((item, i) => (
                    <motion.button
                      key={item.to}
                      custom={i + mainNavItems.length}
                      variants={navItemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleNavigate(item.to)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                        isActive(item.to)
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive(item.to)
                          ? "bg-primary-foreground/20"
                          : "bg-muted group-hover:bg-background"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </motion.button>
                  ))}
                </div>

                <div className="px-6 py-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                {/* Account / Admin */}
                <div className="px-3 space-y-0.5">
                  <button
                    onClick={() => handleNavigate("/account")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                      isActive("/account")
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isActive("/account")
                        ? "bg-primary-foreground/20"
                        : "bg-muted group-hover:bg-background"
                    )}>
                      <User className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-left">Account</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleNavigate("/admin")}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                        isActive("/admin")
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive("/admin")
                          ? "bg-primary-foreground/20"
                          : "bg-muted group-hover:bg-background"
                      )}>
                        <Settings className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-left">Admin Panel</span>
                    </button>
                  )}
                </div>
              </nav>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wider">
                    KAUNG COMPUTER v1.0
                  </p>
                </div>
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
        </div>
      </header>
    </>
  );
};

export default DrawerNav;
