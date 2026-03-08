import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

const MobileLayout = ({ children, className, hideNav }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={cn(
          "w-full min-h-screen bg-background relative mx-auto",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
