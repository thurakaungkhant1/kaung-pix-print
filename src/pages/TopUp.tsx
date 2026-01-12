import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Wallet, 
  CreditCard, 
  Phone, 
  Copy, 
  Check, 
  Clock, 
  XCircle, 
  History, 
  Hash,
  Sparkles,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/MobileLayout";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Deposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_id?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  account_name: string | null;
  account_number: string;
  icon_name: string;
  gradient_color: string;
}

const TopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [activeStep, setActiveStep] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (user) {
      fetchDeposits();
      fetchWalletBalance();
    }
    fetchPaymentMethods();
  }, [user]);

  const fetchPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setPaymentMethods(data || []);
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setWalletBalance(data?.wallet_balance || 0);
  };

  const fetchDeposits = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('wallet_deposits')
        .select('id, amount, status, created_at, transaction_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhone(text);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />{t('approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />{t('rejected')}</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />{t('pending')}</Badge>;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
      setActiveStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount || !screenshot || !transactionId) {
      toast.error(language === 'my' ? "ကျေးဇူးပြု၍ အကွက်အားလုံးဖြည့်ပါ" : "Please fill in all fields");
      return;
    }

    // Validate transaction ID is exactly 6 digits
    if (!/^\d{6}$/.test(transactionId)) {
      toast.error(language === 'my' ? "ငွေလွှဲအမှတ် နောက်ဆုံး ၆ လုံး ထည့်ပါ" : "Please enter exactly 6 digits for Transaction ID");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(language === 'my' ? "ငွေပမာဏမှန်ကန်စွာထည့်ပါ" : "Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('wallet_deposits')
        .insert({
          user_id: user.id,
          amount: amountNum,
          screenshot_url: fileName,
          transaction_id: transactionId,
        });

      if (insertError) throw insertError;

      setIsSuccess(true);
      fetchDeposits();
      toast.success(language === 'my' ? "ငွေသွင်းတောင်းဆိုမှု တင်သွင်းပြီးပါပြီ" : "Deposit request submitted! Awaiting admin approval.");

    } catch (error: any) {
      console.error('Error submitting deposit:', error);
      toast.error(error.message || (language === 'my' ? "ငွေသွင်းတောင်းဆိုမှု မအောင်မြင်ပါ" : "Failed to submit deposit request"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setTransactionId("");
    setScreenshot(null);
    setPreviewUrl(null);
    setIsSuccess(false);
    setActiveStep(1);
  };

  const presetAmounts = [5000, 10000, 20000, 50000, 100000];

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Phone': return Phone;
      case 'CreditCard': return CreditCard;
      case 'Wallet': return Wallet;
      default: return CreditCard;
    }
  };

  if (!user) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
          <Card className="w-full max-w-md border-primary/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                  <Wallet className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {language === 'my' ? "ဝင်ရောက်ရန်လိုအပ်သည်" : "Login Required"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === 'my' ? "ငွေသွင်းရန် ကျေးဇူးပြု၍ ဝင်ရောက်ပါ။" : "Please login to top up your wallet."}
              </p>
              <Button onClick={() => navigate('/auth/login')} className="w-full h-12 text-base font-semibold">
                {language === 'my' ? "ဝင်ရောက်ရန်" : "Login"}
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24">
        {/* Premium Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative px-4 pt-6 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full bg-background/50 backdrop-blur-sm border border-border/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{t('deposit')}</h1>
                <p className="text-sm text-muted-foreground">
                  {language === 'my' ? "သင့်အကောင့်ထဲ ငွေထည့်ပါ" : "Add funds to your account"}
                </p>
              </div>
            </div>

            {/* Wallet Balance Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/5 backdrop-blur-sm shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {language === 'my' ? "လက်ကျန်ငွေ" : "Current Balance"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/wallet-history')}
                    className="gap-1 text-primary hover:text-primary"
                  >
                    <History className="h-4 w-4" />
                    {t('history')}
                  </Button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-neon">{walletBalance.toLocaleString()}</span>
                  <span className="text-lg text-muted-foreground">Ks</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {language === 'my' ? "လုံခြုံသော ငွေပေးချေမှု" : "Secure & Protected"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="px-4 space-y-6">
          {isSuccess ? (
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-background overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
              <CardContent className="relative py-12 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
                  <div className="relative">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {language === 'my' ? "တောင်းဆိုမှု တင်သွင်းပြီးပါပြီ!" : "Request Submitted!"}
                </h3>
                <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                  {language === 'my' 
                    ? "သင့်ငွေသွင်းမှုကို အတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။" 
                    : "Your deposit is pending approval. You'll be notified once it's approved."}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1 h-12">
                    <Zap className="h-4 w-4 mr-2" />
                    {language === 'my' ? "အသစ်ထပ်သွင်းမည်" : "New Deposit"}
                  </Button>
                  <Button onClick={() => navigate('/wallet-history')} className="flex-1 h-12">
                    <History className="h-4 w-4 mr-2" />
                    {t('history')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-2",
                      step < 3 && "flex-1"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                      activeStep >= step
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={cn(
                        "flex-1 h-0.5 rounded-full transition-all duration-500",
                        activeStep > step ? "bg-primary" : "bg-muted"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-4 px-2">
                <span>{language === 'my' ? "ငွေလွှဲမည်" : "Transfer"}</span>
                <span>{language === 'my' ? "အချက်အလက်" : "Details"}</span>
                <span>{language === 'my' ? "ပုံတင်မည်" : "Upload"}</span>
              </div>

              {/* Payment Methods - Premium Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">{t('paymentMethod')}</h2>
                </div>
                <div className="space-y-3">
                  {paymentMethods.map((method, index) => {
                    const IconComponent = getIconComponent(method.icon_name);
                    return (
                      <Card 
                        key={method.id} 
                        className={cn(
                          "border-border/50 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer group",
                          "animate-fade-in"
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => copyToClipboard(method.account_number)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                            method.gradient_color
                          )}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{method.name}</p>
                            {method.account_name && (
                              <p className="text-xs text-muted-foreground">{method.account_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground font-mono tracking-wide">
                              {method.account_number}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "shrink-0 transition-all duration-300",
                              copiedPhone === method.account_number && "text-green-500"
                            )}
                          >
                            {copiedPhone === method.account_number ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Copy className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Instructions Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <p className="font-semibold text-primary">
                        {language === 'my' ? "ငွေသွင်းနည်း" : "How to deposit"}
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>{language === 'my' ? "အထက်ပါ ငွေပေးချေနည်းများထဲမှ တစ်ခုသို့ လွှဲပြောင်းပါ" : "Transfer to one of the payment methods above"}</li>
                        <li>{language === 'my' ? "ငွေလွှဲမှတ်ချက်တွင် သင့်အမည်ထည့်ပါ" : "Include your username in the transfer note"}</li>
                        <li>{language === 'my' ? "ငွေလွှဲပြေစာ ဓာတ်ပုံရိုက်ပါ" : "Take a screenshot of the transaction"}</li>
                        <li>{language === 'my' ? "အောက်ပါပုံစံဖြည့်ပြီး တင်သွင်းပါ" : "Fill in the form below and submit"}</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t('depositAmount')}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={language === 'my' ? "ငွေပမာဏထည့်ပါ" : "Enter amount"}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (e.target.value) setActiveStep(2);
                    }}
                    className="h-14 text-xl font-bold bg-card border-2 border-border/50 focus:border-primary/50 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    Ks
                  </span>
                </div>
                
                {/* Preset Amounts */}
                <div className="flex flex-wrap gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAmount(preset.toString());
                        setActiveStep(2);
                      }}
                      className={cn(
                        "transition-all duration-200",
                        amount === preset.toString() 
                          ? 'border-primary bg-primary/10 text-primary shadow-md' 
                          : 'hover:border-primary/50'
                      )}
                    >
                      {preset.toLocaleString()} Ks
                    </Button>
                  ))}
                </div>
              </div>

              {/* Transaction ID Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  {t('transactionId')}
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={language === 'my' ? "နောက်ဆုံး ၆ လုံး" : "Last 6 digits"}
                    value={transactionId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTransactionId(value);
                    }}
                    className="h-14 text-2xl bg-card border-2 border-border/50 focus:border-primary/50 tracking-[0.5em] font-mono text-center"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>
                    {language === 'my' 
                      ? "ကျေးဇူးပြု၍ သင့်ငွေလွှဲအမှတ်၏ နောက်ဆုံး ၆ လုံးသာ ထည့်ပါ။" 
                      : "Please enter the last 6 digits of your transaction ID only."}
                  </span>
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  {language === 'my' ? "ငွေပေးချေမှု ဓာတ်ပုံ" : "Payment Screenshot"}
                </Label>
                <Card className={cn(
                  "border-2 border-dashed transition-all duration-300",
                  previewUrl 
                    ? "border-primary/50 bg-primary/5" 
                    : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                )}>
                  <CardContent className="p-6 text-center">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={previewUrl} 
                            alt="Payment screenshot" 
                            className="max-h-48 mx-auto rounded-xl shadow-lg border border-border/50"
                          />
                          <div className="absolute -top-2 -right-2 p-1.5 rounded-full bg-green-500 text-white shadow-lg">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScreenshot(null);
                            setPreviewUrl(null);
                            setActiveStep(2);
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          {language === 'my' ? "ဖယ်ရှားရန်" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <div className="relative inline-block mb-4">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                          <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                            <Upload className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <p className="font-semibold text-foreground mb-1">
                          {language === 'my' ? "ဓာတ်ပုံတင်ရန် နှိပ်ပါ" : "Click to upload screenshot"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !amount || !screenshot || !transactionId || transactionId.length !== 6}
                className={cn(
                  "w-full h-14 text-lg font-semibold relative overflow-hidden group",
                  "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary",
                  "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
                  "transition-all duration-300"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    {language === 'my' ? "ငွေသွင်းတောင်းဆိုမည်" : "Submit Deposit Request"}
                  </>
                )}
              </Button>

              {/* Recent Deposits */}
              {deposits.length > 0 && (
                <div className="space-y-3 mt-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">
                        {language === 'my' ? "မကြာသေးမီ ငွေသွင်းမှုများ" : "Recent Deposits"}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/wallet-history')}
                      className="text-xs text-primary"
                    >
                      {language === 'my' ? "အားလုံးကြည့်မည်" : "View All"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {deposits.slice(0, 5).map((deposit, index) => (
                      <Card 
                        key={deposit.id} 
                        className={cn(
                          "border-border/50 transition-all duration-300 hover:border-primary/30",
                          "animate-fade-in"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              deposit.status === 'approved' ? "bg-green-500/10" :
                              deposit.status === 'rejected' ? "bg-red-500/10" : "bg-yellow-500/10"
                            )}>
                              {deposit.status === 'approved' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : deposit.status === 'rejected' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold">
                                +{deposit.amount.toLocaleString()} Ks
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(deposit.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(deposit.status)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default TopUp;