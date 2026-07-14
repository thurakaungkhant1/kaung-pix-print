import { ArrowLeft, Mail, Send, Headphones, Copy, Check, ExternalLink, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    } catch {
      toast.error("Failed to copy");
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      label: "Email",
      value: "thurakaungk@gmail.com",
      href: "mailto:thurakaungk@gmail.com",
      color: "#3b82f6",
      bgColor: "bg-blue-500/10",
      copyable: true,
    },
    {
      icon: Send,
      label: "Telegram",
      value: "@thurakaungkhant1",
      href: "https://t.me/thurakaungkhant1",
      color: "#0ea5e9",
      bgColor: "bg-sky-500/10",
      external: true,
    },
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10" />
          <div className="absolute inset-0 bg-gradient-glow opacity-50" />
          <div className="relative z-10 px-4 pt-4 pb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/account")}
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
                We're here to help! Reach out through email or Telegram.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-2 space-y-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Business Hours</h3>
                  <p className="text-sm text-muted-foreground">6:00 AM - 2:00 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-1">CONTACT METHODS</h2>
            {contactMethods.map((method) => (
              <Card
                key={method.label}
                className="border-border/50 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group"
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn("p-3 rounded-xl transition-all duration-300", method.bgColor, "group-hover:scale-110")}>
                      <method.icon className="h-5 w-5" style={{ color: method.color }} />
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

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
              asChild
            >
              <a href="mailto:thurakaungk@gmail.com">
                <Mail className="h-5 w-5 mr-2 text-blue-500" />
                <span>Email</span>
              </a>
            </Button>
            <Button
              className="h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all"
              asChild
            >
              <a href="https://t.me/thurakaungkhant1" target="_blank" rel="noopener noreferrer">
                <Send className="h-5 w-5 mr-2" />
                <span>Telegram</span>
              </a>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-4 pb-2">
            We typically respond within 24 hours
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Contact;
