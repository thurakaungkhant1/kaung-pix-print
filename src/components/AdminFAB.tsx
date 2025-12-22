import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  X, 
  Package, 
  Image, 
  ShoppingCart,
  Users,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AdminFABProps {
  pendingOrders?: number;
  onNavigateToTab?: (tab: string) => void;
}

const AdminFAB = ({ pendingOrders = 0, onNavigateToTab }: AdminFABProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { 
      id: "add-product", 
      label: "Add Product", 
      icon: Package, 
      color: "bg-blue-500",
      action: () => navigate("/admin/products/new")
    },
    { 
      id: "add-photo", 
      label: "Add Photo", 
      icon: Image, 
      color: "bg-green-500",
      action: () => navigate("/admin/photos/new")
    },
    { 
      id: "pending-orders", 
      label: `Pending Orders${pendingOrders > 0 ? ` (${pendingOrders})` : ""}`, 
      icon: ShoppingCart, 
      color: "bg-amber-500",
      badge: pendingOrders,
      action: () => {
        onNavigateToTab?.("orders");
        setIsOpen(false);
      }
    },
    { 
      id: "premium-requests", 
      label: "Premium Requests", 
      icon: Crown, 
      color: "bg-purple-500",
      action: () => navigate("/admin/premium-requests")
    },
    { 
      id: "users", 
      label: "Manage Users", 
      icon: Users, 
      color: "bg-indigo-500",
      action: () => {
        onNavigateToTab?.("users");
        setIsOpen(false);
      }
    },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end">
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 rounded-lg bg-card text-foreground text-sm font-medium shadow-lg border border-border whitespace-nowrap">
                    {action.label}
                  </span>
                  <div className={cn(
                    "relative h-12 w-12 rounded-full flex items-center justify-center shadow-lg",
                    action.color,
                    "text-white transition-transform group-hover:scale-110"
                  )}>
                    <action.icon className="h-5 w-5" />
                    {action.badge && action.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                        {action.badge > 99 ? '99+' : action.badge}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-lg",
          "bg-primary text-primary-foreground",
          "transition-all duration-300 hover:scale-105 active:scale-95"
        )}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
        {!isOpen && pendingOrders > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
            {pendingOrders > 99 ? '99+' : pendingOrders}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default AdminFAB;
