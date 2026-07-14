import { ArrowLeft, Shield, Lock, Eye, Database, Mail, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";

const Privacy = () => {
  const navigate = useNavigate();
  const lastUpdated = "July 2026";

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: `Kaung Digital Store တွင် account ဖွင့်သည့်အခါ သင်၏ name, email, phone number တို့ကို စုဆောင်းပါသည်။
      Game top-up order (MLBB, PUBG) များအတွက် player ID, server ID၊ Digital product order များအတွက် delivery
      information၊ Wallet deposit များအတွက် transaction ID နှင့် screenshot များ၊ mini games ဆော့ရာမှ score, coin
      history များကို သိမ်းဆည်းပါသည်။`,
    },
    {
      icon: Eye,
      title: "How We Use Your Data",
      content: `သင်၏ data ကို Kaung Digital Store တွင် order များ ဆောင်ရွက်ခြင်း၊ Wallet deposit အတည်ပြုခြင်း၊
      Game top-up auto-delivery ပြုလုပ်ခြင်း၊ Customer support ဆက်သွယ်ခြင်း၊ mini game coin, reward ပေးအပ်ခြင်း
      နှင့် service ကို ပိုမိုကောင်းမွန်စေရန်အတွက်သာ အသုံးပြုပါသည်။ သင်၏ personal data များကို ပြင်ပ third party
      များသို့ ရောင်းချခြင်း လုံးဝ မပြုပါ။`,
    },
    {
      icon: Lock,
      title: "Data Security",
      content: `Password များကို secure hashing နှင့် သိမ်းဆည်းထားပြီး၊ data အားလုံးကို HTTPS ဖြင့် encrypt လုပ်ကာ
      Row-Level Security (RLS) policy များဖြင့် ကာကွယ်ထားပါသည်။ Wallet deposit screenshot နှင့် order detail
      များကို ခွင့်ပြုထားသော admin များသာ ကြည့်ရှုနိုင်ပါသည်။`,
    },
    {
      icon: Shield,
      title: "Third-Party Services",
      content: `Kaung Digital Store သည် Google AdSense (advertising)၊ Smile.one (game top-up delivery)၊
      KBZPay / WavePay (payment) တို့ကို အသုံးပြုပါသည်။ ဤ service များသည် သီးခြား privacy policy ရှိပါသည်။
      Personalized ads အတွက် https://www.google.com/settings/ads မှ opt-out လုပ်နိုင်ပါသည်။`,
    },
    {
      icon: AlertCircle,
      title: "Cookies & Local Storage",
      content: `Login session ကို ထိန်းသိမ်းရန်၊ language preference ကို မှတ်ရန်၊ theme (light/dark) ကို သိမ်းရန်နှင့်
      ads ဖော်ပြရန်အတွက် cookies နှင့် browser local storage ကို အသုံးပြုပါသည်။ Browser settings မှ အချိန်မရွေး
      ရှင်းလင်းနိုင်ပါသည်။`,
    },
    {
      icon: Mail,
      title: "Your Rights",
      content: `သင်၏ personal data ကို ကြည့်ရှုခြင်း၊ ပြင်ဆင်ခြင်း၊ ဖျက်ခြင်း တို့ကို တောင်းဆိုနိုင်ပါသည်။
      Account ဖျက်လိုပါက Contact Us မှတဆင့် ဆက်သွယ်နိုင်ပြီး ရက် ၃၀ အတွင်း ဆောင်ရွက်ပေးပါမည်။`,
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
                Kaung Digital Store သည် သင်၏ privacy ကို လေးစားပါသည်။ ဤ Privacy Policy သည် ကျွန်ုပ်တို့မှ
                သင်၏ data များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်ပေးသည်ကို ရှင်းပြထားပါသည်။
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
                page မှ email သို့မဟုတ် Telegram ဖြင့် ဆက်သွယ်နိုင်ပါသည်။
              </p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default Privacy;
