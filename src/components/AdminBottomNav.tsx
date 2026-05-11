import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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

  const moreGroups = [
    {
      label: "Finance",
      items: [
        { id: "deposits", label: "Deposits", route: "/admin/deposits" },
        { id: "point-management", label: "Points" },
        { id: "point-history", label: "Point History" },
      ]
    },
    {
      label: "Content",
      items: [
        { id: "mlbb-packages", label: "Mobile Legends", route: "/admin/diamond-packages" },
        { id: "pubg-packages", label: "PUBG", route: "/admin/pubg-uc-packages" },
        { id: "mobile-services-shop", label: "Mobile", route: "/admin/mobile-services" },
        { id: "categories", label: "Shop Categories", route: "/admin/categories" },
        { id: "photos", label: "Photos" },
        { id: "banners", label: "Promo Banners", route: "/admin/banners" },
      ]
    },
    {
      label: "Orders",
      items: [
        { id: "diamond-orders", label: "Game Orders" },
        { id: "wallets", label: "Wallet Management", route: "/admin/wallets" },
      ]
    },
    {
      label: "Settings",
      items: [
        { id: "payment-methods", label: "Payment Methods", route: "/admin/payment-methods" },
        { id: "mobile-services", label: "Mobile Services", route: "/admin/mobile-services" },
        { id: "ads", label: "Ads", route: "/admin/ads" },
        { id: "settings", label: "Settings" },
      ]
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px]",
              "transition-all duration-200",
              activeTab === item.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="h-4.5 w-4.5" />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 h-3.5 min-w-3.5 px-1 flex items-center justify-center text-[8px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-muted-foreground">
              <MoreHorizontal className="h-4.5 w-4.5" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-52 mb-2 bg-card border border-border z-[60] max-h-80 overflow-y-auto"
            sideOffset={8}
          >
            {moreGroups.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </DropdownMenuLabel>
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => {
                      if (item.route) navigate(item.route);
                      else onTabChange(item.id);
                    }}
                    className="cursor-pointer text-sm"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account")} className="cursor-pointer text-primary text-sm font-medium">
              Back to App
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
