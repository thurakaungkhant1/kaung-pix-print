import { Home, Image, Heart, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/photo", icon: Image, label: "Photo" },
    { to: "/favourite", icon: Heart, label: "Favourite" },
    { to: "/account", icon: User, label: "Account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-primary/20 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center flex-1 h-full text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              activeClassName="text-primary-foreground bg-nav-active/20"
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5]")} />
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
