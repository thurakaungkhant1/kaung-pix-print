import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useMobileAdminCheck } from "@/hooks/useMobileAdminCheck";

interface Props {
  children: ReactNode;
}

/**
 * Allows both `admin` and `mobile_admin` roles.
 */
const ProtectedMobileAdminRoute = ({ children }: Props) => {
  const { allowed, isLoading } = useMobileAdminCheck({ redirectTo: "/", redirectOnFail: true });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return allowed ? <>{children}</> : null;
};

export default ProtectedMobileAdminRoute;
