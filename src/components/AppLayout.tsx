import DrawerNav from "@/components/DrawerNav";

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const AppLayout = ({ children, hideNav }: AppLayoutProps) => {
  if (hideNav) return <>{children}</>;
  
  return (
    <div className="min-h-screen bg-background">
      <DrawerNav />
      <main>{children}</main>
    </div>
  );
};

export default AppLayout;
