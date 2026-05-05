import { ArrowLeft, Camera, Users, Award, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import MobileLayout from "@/components/MobileLayout";
import AnimatedPage from "@/components/animations/AnimatedPage";

const About = () => {
  const navigate = useNavigate();

  return (
    <AnimatedPage>
      <MobileLayout>
        <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
            <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-primary-foreground/10 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">About Us</h1>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto p-4 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Kaung Computer</h2>
                  <p className="text-xs text-muted-foreground">Photography • Printing • Game Top-up</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kaung Computer သည် Myanmar အတွင်းရှိ user များအတွက် photography services, photo printing,
                game diamond/UC top-ups, mobile services နှင့် online shopping ကို တစ်နေရာတည်းတွင် လွယ်ကူစွာ
                ရရှိနိုင်စေရန် ဖန်တီးထားသော platform တစ်ခု ဖြစ်ပါသည်။
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, title: "10K+ Users", desc: "Trusted community" },
              { icon: Award, title: "5+ Years", desc: "Service experience" },
              { icon: Camera, title: "50K+ Photos", desc: "Captured & delivered" },
              { icon: Sparkles, title: "24/7", desc: "Customer support" },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="p-4 text-center">
                  <item.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="font-bold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <section>
                <h3 className="font-bold text-base mb-2">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ကျွန်ုပ်တို့၏ ရည်ရွယ်ချက်မှာ Myanmar user များအတွက် digital services များကို လုံခြုံစိတ်ချစွာ၊
                  မြန်ဆန်စွာ၊ စျေးနှုန်းသင့်တင့်စွာ ရရှိစေရန် ဖြစ်ပါသည်။
                </p>
              </section>
              <section>
                <h3 className="font-bold text-base mb-2">What We Offer</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
                  <li>Professional photography & photo gallery delivery</li>
                  <li>MLBB & PUBG diamond/UC top-up (Auto delivery)</li>
                  <li>Mobile phone bill top-up & data plans</li>
                  <li>Physical product shopping in MMK</li>
                  <li>Mini games & rewards system</li>
                  <li>Secure wallet-based payments</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-base mb-2">Contact</h3>
                <p className="text-sm text-muted-foreground">
                  Questions or feedback? Visit our{" "}
                  <button onClick={() => navigate("/contact")} className="text-primary font-medium underline">
                    Contact Us
                  </button>{" "}
                  page.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    </AnimatedPage>
  );
};

export default About;
