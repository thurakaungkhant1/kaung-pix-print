import { ArrowLeft, Phone, Mail, MapPin, Send, MessageCircle, Clock, Headphones, Copy, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import MobileLayout from "@/components/MobileLayout";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Contact = () => {
  const navigate = useNavigate();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      label: "Phone",
      value: "09694577177",
      href: "tel:09694577177",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      copyable: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: "thurakaungk@gmail.com",
      href: "mailto:thurakaungk@gmail.com",
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-500/10",
      copyable: true,
    },
    {
      icon: Send,
      label: "Telegram",
      value: "@thurakaungkhant1",
      href: "https://t.me/thurakaungkhant1",
      color: "from-sky-400 to-blue-500",
      bgColor: "bg-sky-500/10",
      external: true,
    },
    {
      icon: MessageCircle,
      label: "Viber",
      value: "+959694577177",
      href: "viber://chat?number=+959694577177",
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-500/10",
      copyable: true,
    },
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          
          <div className="relative z-10 px-4 pt-4 pb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mb-4 text-foreground hover:bg-background/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 mb-4 ring-4 ring-primary/10">
                <Headphones className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Contact Us</h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                We're here to help! Reach out through any of these channels.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-2 space-y-4">
          {/* Business Hours Card */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Business Hours</h3>
                  <p className="text-sm text-muted-foreground">Mon - Sat: 9:00 AM - 6:00 PM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Methods */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-1">CONTACT METHODS</h2>
            
            {contactMethods.map((method) => (
              <Card 
                key={method.label} 
                className="border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group"
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-all duration-300",
                      method.bgColor,
                      "group-hover:scale-110"
                    )}>
                      <div className={cn("bg-gradient-to-br bg-clip-text", method.color)}>
                        <method.icon className="h-5 w-5 text-current" style={{ 
                          color: method.color.includes('green') ? '#22c55e' :
                                 method.color.includes('blue') ? '#3b82f6' :
                                 method.color.includes('sky') ? '#0ea5e9' :
                                 method.color.includes('purple') ? '#a855f7' : '#10b981'
                        }} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{method.label}</h3>
                      <p className="text-muted-foreground text-sm truncate">{method.value}</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {method.copyable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(method.value, method.label);
                          }}
                        >
                          {copiedItem === method.label ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary"
                        asChild
                      >
                        <a 
                          href={method.href}
                          target={method.external ? "_blank" : undefined}
                          rel={method.external ? "noopener noreferrer" : undefined}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Address Card */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-1">LOCATION</h2>
            
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-orange-500/10 shrink-0">
                      <MapPin className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm mb-1">Address</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        လက်ပံတန်းမြို့နယ်၊ နတ်ဖန်ကွင်းကျေးရွာ
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Map placeholder */}
                <div className="h-32 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center border-t border-border/50">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Natphankwin Village</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
              asChild
            >
              <a href="tel:09694577177">
                <Phone className="h-5 w-5 mr-2 text-green-500" />
                <span>Call Now</span>
              </a>
            </Button>
            
            <Button
              className="h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all"
              asChild
            >
              <a 
                href="https://t.me/thurakaungkhant1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send className="h-5 w-5 mr-2" />
                <span>Message</span>
              </a>
            </Button>
          </div>

          {/* Support Note */}
          <p className="text-center text-xs text-muted-foreground pt-4 pb-2">
            We typically respond within 24 hours
          </p>
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default Contact;
