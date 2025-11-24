import { ArrowLeft, Phone, Mail, MapPin, Send, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-primary text-primary-foreground p-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Contact Us</h1>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Get in Touch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone */}
            <a 
              href="tel:09694577177"
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Phone</h3>
                <p className="text-muted-foreground group-hover:text-primary transition-colors">
                  09694577177
                </p>
              </div>
            </a>

            {/* Email */}
            <a 
              href="mailto:thurakaungk@gmail.com"
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-muted-foreground group-hover:text-primary transition-colors">
                  thurakaungk@gmail.com
                </p>
              </div>
            </a>

            {/* Address */}
            <div className="flex items-start gap-4 p-3 rounded-lg">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Address</h3>
                <p className="text-muted-foreground">
                  လက်ပံတန်းြမို့နယ်၊ နတ်ဖန်ကွင်းကျေးရွာ
                </p>
              </div>
            </div>

            {/* Telegram */}
            <a 
              href="https://t.me/thurakaungkhant1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Telegram</h3>
                <p className="text-muted-foreground group-hover:text-primary transition-colors">
                  @thurakaungkhant1
                </p>
              </div>
            </a>

            {/* Viber */}
            <a 
              href="viber://chat?number=+959694577177"
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Viber</h3>
                <p className="text-muted-foreground group-hover:text-primary transition-colors">
                  +959694577177
                </p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Contact;
