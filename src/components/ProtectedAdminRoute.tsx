import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { isAdmin, isLoading } = useAdminCheck({ redirectTo: "/", redirectOnFail: true });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
};

export default ProtectedAdminRoute;
