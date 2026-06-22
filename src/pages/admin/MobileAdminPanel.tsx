import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminBottomNav from "@/components/AdminBottomNav";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  ArrowLeft,
  Plus,
  ListOrdered,
  Headphones,
  Smartphone,
  Wifi,
  Phone,
  ChevronRight,
} from "lucide-react";

const MobileAdminPanel = () => {
  const navigate = useNavigate();
  useAdminCheck({ redirectTo: "/", redirectOnFail: true });

  const sections = [
    {
      title: "Add / Manage Services",
      desc: "Phone Top-up, Data Plans & Voice Plans ထည့်/ပြင်ရန်",
      icon: Plus,
      color: "bg-primary/10 text-primary",
      route: "/admin/mobile-services",
    },
    {
      title: "Mobile Orders",
      desc: "Mobile services နဲ့ ပတ်သက်တဲ့ orders များကို ကြည့်/စီမံရန်",
      icon: ListOrdered,
      color: "bg-blue-500/10 text-blue-500",
      route: "/admin/orders?type=mobile",
    },
    {
      title: "Customer Support",
      desc: "User တွေနဲ့ တိုက်ရိုက် chat ဖြေဆိုရန်",
      icon: Headphones,
      color: "bg-green-500/10 text-green-500",
      route: "/admin/support",
    },
  ];

  const quickCats = [
    { label: "Phone Top-up", icon: Smartphone, color: "text-green-500" },
    { label: "Data Plans", icon: Wifi, color: "text-blue-500" },
    { label: "Voice Plans", icon: Phone, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-screen-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Mobile Admin Panel</h1>
            <p className="text-xs text-muted-foreground">
              Services • Orders • Support
            </p>
          </div>
        </div>
      </header>

      <main className="container max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {quickCats.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <Icon className={`h-6 w-6 ${c.color}`} />
                  <span className="text-xs font-medium text-center">{c.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.route}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                onClick={() => navigate(s.route)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${s.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <AdminBottomNav activeTab="mobile-panel" onTabChange={() => {}} />
    </div>
  );
};

export default MobileAdminPanel;
