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
          // Desktop comfort: widen the mobile-first containers and grids
          // without changing any behaviour or features.
          "lg:[&_.max-w-screen-sm]:max-w-5xl",
          "lg:[&_.max-w-md]:max-w-4xl lg:[&_.max-w-lg]:max-w-4xl lg:[&_.max-w-2xl]:max-w-5xl",
          "lg:[&_.max-w-screen-lg]:max-w-7xl",
          "lg:[&_.max-w-screen-md]:max-w-5xl",
          "xl:[&_.max-w-screen-md]:max-w-7xl",
          "lg:[&_.grid-cols-2]:grid-cols-3 xl:[&_.grid-cols-2]:grid-cols-4",
          "lg:[&_header.sticky]:px-8 lg:pb-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};


export default MobileLayout;
