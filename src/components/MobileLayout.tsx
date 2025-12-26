import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

const MobileLayout = ({ children, className, hideNav }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-muted/30 flex justify-center items-start">
      <div
        className={cn(
          "w-full max-w-[480px] min-h-screen bg-background relative",
          "md:shadow-2xl md:border-x md:border-border/50 md:my-0",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileLayout;
