import { ArrowLeft, FileText, ShoppingCart, Wallet, Gamepad2, AlertTriangle, Scale, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";

const Terms = () => {
  const navigate = useNavigate();
  const lastUpdated = "July 2026";

  const sections = [
    {
      icon: FileText,
      title: "1. Acceptance of Terms",
      content: `Kaung Digital Store ၏ service များကို အသုံးပြုခြင်းဖြင့် သင်သည် ဤ Terms & Conditions များကို
      သဘောတူလက်ခံပြီးဖြစ်ကြောင်း မှတ်ယူပါသည်။ သဘောမတူပါက service ကို အသုံးမပြုပါနှင့်။`,
    },
    {
      icon: ShoppingCart,
      title: "2. Orders & Delivery",
      content: `Game top-up (MLBB Diamonds, PUBG UC) order များသည် auto-delivery ဖြစ်ပြီး Player ID, Server ID
      မှန်ကန်မှုကို သင်ကိုယ်တိုင် တာဝန်ယူရပါမည်။ ID မှားယွင်းခြင်းကြောင့် ပျောက်ဆုံးသော diamond/UC များကို
      Kaung Digital Store မှ refund မပြန်ပေးနိုင်ပါ။ Digital product (software key, streaming account, gift card
      စသည်) များကို order approval ပြီးလျှင် ချက်ချင်း ပေးပို့ပါသည်။`,
    },
    {
      icon: Wallet,
      title: "3. Wallet & Payments",
      content: `Kaung Digital Store wallet သို့ deposit လုပ်ရာတွင် KBZPay သို့မဟုတ် WavePay မှ ငွေလွှဲပြီးနောက်
      transaction ID ၏ နောက်ဆုံး ဂဏန်း ၆ လုံးနှင့် screenshot ကို တင်ပြရမည်။ Admin မှ manual verify ပြုလုပ်ပြီးမှ
      wallet balance ထဲ ဝင်ပါမည်။ False deposit တင်ပြခြင်းသည် account suspension ခံရနိုင်ပါသည်။ Wallet balance ကို
      ငွေသား ပြန်ထုတ်ယူ၍ မရပါ — Kaung Digital Store အတွင်း purchase အတွက်သာ အသုံးပြုနိုင်ပါသည်။`,
    },
    {
      icon: Gamepad2,
      title: "4. Mini Games & Coins",
      content: `Kaung Digital Store ရှိ mini game များ ဆော့ခြင်းဖြင့် coin ရရှိနိုင်ပါသည်။ Coin တန်ဖိုးများ,
      daily limit နှင့် redeem item များကို admin မှ အချိန်မရွေး ပြောင်းလဲနိုင်ပါသည်။ Cheating, automation script,
      multi-account abuse များကို တင်းကြပ်စွာ တားမြစ်ထားပြီး တွေ့ရှိပါက account ပိတ်သိမ်းခြင်း၊ coin ဖျက်ခြင်း
      ခံရနိုင်ပါသည်။`,
    },
    {
      icon: Scale,
      title: "5. User Conduct",
      content: `Kaung Digital Store ကို တရားဥပဒေနှင့်အညီသာ အသုံးပြုရပါမည်။ Account တစ်ခုတည်းသာ ဖွင့်ရမည်ဖြစ်ပြီး
      account information ကို အခြားသူများသို့ လွှဲပြောင်း၊ ရောင်းချခြင်း မပြုရပါ။ Hacking, phishing, fraudulent
      transaction, abusive behaviour များကြောင့် account ပိတ်သိမ်းခြင်း ခံရနိုင်ပါသည်။`,
    },
    {
      icon: AlertTriangle,
      title: "6. Limitation of Liability",
      content: `Service interruption, third-party API delay (Smile.one, payment gateway), force majeure event
      များကြောင့် ဖြစ်ပေါ်လာသော losses များအတွက် Kaung Digital Store သည် တာဝန်မယူပါ။ Order များကို
      အတည်ပြုပြီးမှသာ delivery ဆောင်ရွက်ပါသည်။`,
    },
    {
      icon: FileText,
      title: "7. Changes to Terms",
      content: `Kaung Digital Store သည် Terms များကို ကြိုတင်အကြောင်းမကြားဘဲ ပြင်ဆင်နိုင်ပါသည်။ Service ကို
      ဆက်လက်အသုံးပြုခြင်းသည် ပြင်ဆင်ထားသော terms အသစ်ကို လက်ခံပြီးဖြစ်ကြောင်း ဆိုလိုပါသည်။`,
    },
    {
      icon: Mail,
      title: "8. Contact",
      content: `မေးခွန်း သို့မဟုတ် ပြဿနာများရှိပါက Contact Us page မှ email သို့မဟုတ် Telegram ဖြင့်
      ဆက်သွယ်နိုင်ပါသည်။`,
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
                ဤ Terms & Conditions သည် Kaung Digital Store platform ကို အသုံးပြုသူ user အားလုံးနှင့် သက်ဆိုင်ပါသည်။
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
