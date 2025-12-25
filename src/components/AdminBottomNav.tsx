import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  Settings,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingOrders?: number;
}

const AdminBottomNav = ({ activeTab, onTabChange, pendingOrders = 0 }: AdminBottomNavProps) => {
  const navigate = useNavigate();

  const mainNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: pendingOrders },
    { id: "shop", label: "Shop", icon: Package },
  ];

  const moreNavItems = [
    { id: "products", label: "Products", route: "/admin/products" },
    { id: "categories", label: "Categories", route: "/admin/categories" },
    { id: "point-management", label: "Point Management" },
    { id: "point-history", label: "Point History" },
    { id: "diamond-orders", label: "Game Orders" },
    { id: "photos", label: "Photos" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[60px]",
              "transition-all duration-200",
              activeTab === item.id
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        
        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[60px]",
                "transition-all duration-200 text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 mb-2 bg-card border border-border z-[60]"
            sideOffset={8}
          >
            {moreNavItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => {
                  if (item.route) {
                    navigate(item.route);
                  } else {
                    onTabChange(item.id);
                  }
                }}
                className="cursor-pointer"
              >
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => navigate("/account")}
              className="cursor-pointer text-primary"
            >
              Back to App
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
