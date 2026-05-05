import { ArrowLeft, Shield, Lock, Eye, Database, Mail, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";

const Privacy = () => {
  const navigate = useNavigate();
  const lastUpdated = "May 2026";

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: `We collect information you provide when creating an account (name, email, phone number), making purchases (delivery address, payment details), and using our services (order history, photo favourites, game scores, wallet transactions). We may also collect device information, IP addresses, and usage analytics to improve the service.`,
    },
    {
      icon: Eye,
      title: "How We Use Your Data",
      content: `Your data is used to deliver orders, verify wallet deposits, provide customer support, process game top-ups, send transactional notifications, prevent fraud, and improve our services. We do not sell your personal data to third parties.`,
    },
    {
      icon: Lock,
      title: "Data Security",
      content: `Account passwords are securely hashed. All data is transmitted over HTTPS and stored in secure cloud infrastructure with row-level security policies. Only authorised admins can access deposit verification screenshots and order details.`,
    },
    {
      icon: Shield,
      title: "Third-Party Services",
      content: `We use Google AdSense for advertising. AdSense may use cookies to serve ads based on your prior visits. You can opt out of personalised advertising at https://www.google.com/settings/ads. We integrate with Smile.one for game top-up delivery and use Lovable Cloud for backend infrastructure.`,
    },
    {
      icon: AlertCircle,
      title: "Cookies & Local Storage",
      content: `We use cookies and browser local storage to keep you logged in, remember your language preference, store offline game progress, and serve relevant ads. You can clear these at any time from your browser settings.`,
    },
    {
      icon: Mail,
      title: "Your Rights",
      content: `You have the right to access, correct, or delete your personal data. To exercise these rights, contact us via the Contact Us page. Account deletion requests are processed within 30 days.`,
    },
  ];

  return (
    <AnimatedPage>
      <MobileLayout>
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
            <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Privacy Policy</h1>
              <p className="text-xs text-primary-foreground/80">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 space-y-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kaung Computer ("we", "our") သည် သင်၏ privacy ကို လေးစားပါသည်။ ဤ Privacy Policy သည်
                ကျွန်ုပ်တို့မှ သင်၏ data များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်ပေးသည်ကို ရှင်းပြထားပါသည်။
              </p>
            </CardContent>
          </Card>

          {sections.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-1">{s.content}</p>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Contact Us</h3>
              <p className="text-sm text-muted-foreground">
                Privacy နှင့်ပတ်သက်သော မေးခွန်းများအတွက်{" "}
                <button onClick={() => navigate("/contact")} className="text-primary font-medium underline">
                  Contact Us
                </button>{" "}
                page မှ ဆက်သွယ်နိုင်ပါသည်။
              </p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default Privacy;
