import { ArrowLeft, FileText, ShoppingCart, Wallet, Gamepad2, AlertTriangle, Scale, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";

const Terms = () => {
  const navigate = useNavigate();
  const lastUpdated = "May 2026";

  const sections = [
    {
      icon: FileText,
      title: "1. Acceptance of Terms",
      content: `Kaung Computer ("we", "us") ၏ services များကို အသုံးပြုခြင်းဖြင့် သင်သည် ဤ Terms & Conditions
       များကို သဘောတူလက်ခံပြီးဖြစ်ကြောင်း မှတ်ယူပါသည်။ သဘောမတူပါက service ကို အသုံးမပြုပါနှင့်။`,
    },
    {
      icon: ShoppingCart,
      title: "2. Orders & Delivery",
      content: `Game top-up orders (MLBB, PUBG) သည် auto-delivery ဖြစ်ပြီး player ID မှန်ကန်မှုကို သင်က
      တာဝန်ယူရပါမည်။ ID မှားယွင်းခြင်းကြောင့် ပျောက်ဆုံးသော diamond/UC များကို refund မပြန်ပေးနိုင်ပါ။
      Physical product orders များကို Yangon အတွင်း 1-3 ရက်အတွင်း delivery လုပ်ပေးပါသည်။`,
    },
    {
      icon: Wallet,
      title: "3. Wallet & Payments",
      content: `Wallet deposits များကို manual approval လုပ်ပါသည်။ Transaction ID နှင့် screenshot မှန်ကန်စွာ
      submit လုပ်ပါ။ False deposit submissions များသည် account suspension ခံရနိုင်ပါသည်။ Wallet balance
      များကို cash ပြန်ထုတ်ယူ၍ မရပါ — purchase အတွက်သာ အသုံးပြုနိုင်ပါသည်။`,
    },
    {
      icon: Gamepad2,
      title: "4. Mini Games & Points",
      content: `Mini game points တန်ဖိုးများကို admin မှ ပြောင်းလဲနိုင်ပါသည်။ Cheating, automation, multi-account
      abuse တို့ကို တင်းကြပ်စွာ တားမြစ်ထားပါသည်။ Daily limit ကျော်လွန်လျှင် points မရရှိပါ။`,
    },
    {
      icon: Scale,
      title: "5. User Conduct",
      content: `Service ကို တရားဥပဒေနှင့်အညီသာ အသုံးပြုရပါမည်။ Hacking, phishing, fraudulent transaction,
      abusive behaviour များကြောင့် account ပိတ်သိမ်းခြင်းခံရနိုင်ပါသည်။`,
    },
    {
      icon: AlertTriangle,
      title: "6. Limitation of Liability",
      content: `Service interruption, third-party API delays (Smile.one, payment gateway), force majeure
      events များမှ ဖြစ်ပေါ်လာသော losses များအတွက် ကျွန်ုပ်တို့သည် တာဝန်မရှိပါ။`,
    },
    {
      icon: FileText,
      title: "7. Changes to Terms",
      content: `Terms များကို ကြိုတင်အကြောင်းမကြားဘဲ ပြင်ဆင်နိုင်ပါသည်။ Service ကို ဆက်လက်အသုံးပြုခြင်းသည်
      ပြင်ဆင်ထားသော terms အသစ်ကို လက်ခံပြီးဖြစ်ကြောင်း ဆိုလိုပါသည်။`,
    },
    {
      icon: Mail,
      title: "8. Contact",
      content: `မေးခွန်းများရှိပါက Contact Us page မှ ဆက်သွယ်နိုင်ပါသည်။`,
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
              <h1 className="text-xl font-bold">Terms & Conditions</h1>
              <p className="text-xs text-primary-foreground/80">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 space-y-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                ဤ Terms & Conditions သည် Kaung Computer platform ကို အသုံးပြုသူ user အားလုံးနှင့် သက်ဆိုင်ပါသည်။
                ကျေးဇူးပြု၍ အသုံးမပြုမီ ဂရုတစိုက်ဖတ်ရှုပါ။
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
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default Terms;
