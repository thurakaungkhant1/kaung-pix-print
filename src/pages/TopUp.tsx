import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Loader2, CheckCircle, AlertCircle, Wallet, CreditCard, Phone, Copy, Check, Clock, XCircle, History, Hash } from "lucide-react";
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

interface Deposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_id?: string;
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

  useEffect(() => {
    if (user) {
      fetchDeposits();
    }
  }, [user]);

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
  };

  const presetAmounts = [5000, 10000, 20000, 50000, 100000];

  const paymentMethods = [
    { name: "KBZ Pay", phone: "09694577177", icon: Phone },
    { name: "Wave Pay", phone: "09694577177", icon: CreditCard },
    { name: "CB Pay", phone: "0211600900000647", icon: Wallet },
  ];

  if (!user) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {language === 'my' ? "ဝင်ရောက်ရန်လိုအပ်သည်" : "Login Required"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {language === 'my' ? "ငွေသွင်းရန် ကျေးဇူးပြု၍ ဝင်ရောက်ပါ။" : "Please login to top up your wallet."}
              </p>
              <Button onClick={() => navigate('/auth/login')} className="w-full">
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
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/10 py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t('deposit')}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'my' ? "သင့်အကောင့်ထဲ ငွေထည့်ပါ" : "Add funds to your account"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {isSuccess ? (
            <Card className="border-green-500/30">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  {language === 'my' ? "တောင်းဆိုမှု တင်သွင်းပြီးပါပြီ!" : "Request Submitted!"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {language === 'my' 
                    ? "သင့်ငွေသွင်းမှုကို အတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်။" 
                    : "Your deposit is pending approval. You'll be notified once it's approved."}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1">
                    {language === 'my' ? "အသစ်ထပ်သွင်းမည်" : "New Deposit"}
                  </Button>
                  <Button onClick={() => navigate('/wallet-history')} className="flex-1">
                    {t('history')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Payment Methods */}
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">{t('paymentMethod')}</h2>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => (
                    <Card key={method.name} className="border-border/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/10">
                            <method.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{method.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{method.phone}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(method.phone)}
                          className="shrink-0"
                        >
                          {copiedPhone === method.phone ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-medium text-primary">
                        {language === 'my' ? "ငွေသွင်းနည်း:" : "How to deposit:"}
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>{language === 'my' ? "အထက်ပါ ငွေပေးချေနည်းများထဲမှ တစ်ခုသို့ လွှဲပြောင်းပါ" : "Transfer to one of the payment methods above"}</li>
                        <li>{language === 'my' ? "ငွေလွှဲမှတ်ချက်တွင် သင့်အမည်ထည့်ပါ" : "Include your username in the transfer note"}</li>
                        <li>{language === 'my' ? "ငွေလွှဲပြေစာ ဓာတ်ပုံရိုက်ပါ" : "Take a screenshot of the transaction"}</li>
                        <li>{language === 'my' ? "ငွေလွှဲအမှတ် နောက်ဆုံး ၆ လုံး ထည့်ပါ" : "Enter last 6 digits of transaction ID"}</li>
                        <li>{language === 'my' ? "ဓာတ်ပုံကို အောက်တွင် တင်ပါ" : "Upload the screenshot below"}</li>
                        <li>{language === 'my' ? "အက်ဒ်မင်အတည်ပြုရန် စောင့်ပါ (ပုံမှန် ၂၄ နာရီအတွင်း)" : "Wait for admin approval (usually within 24 hours)"}</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t('depositAmount')}</Label>
                <Input
                  type="number"
                  placeholder={language === 'my' ? "ငွေပမာဏထည့်ပါ" : "Enter amount"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-lg bg-card"
                />
                
                {/* Preset Amounts */}
                <div className="flex flex-wrap gap-2">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                      className={amount === preset.toString() ? 'border-primary bg-primary/20' : ''}
                    >
                      {preset.toLocaleString()} Ks
                    </Button>
                  ))}
                </div>
              </div>

              {/* Transaction ID Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t('transactionId')}</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                    className="h-12 text-lg bg-card pl-10 tracking-widest font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'my' 
                    ? "ကျေးဇူးပြု၍ သင့်ငွေလွှဲအမှတ်၏ နောက်ဆုံး ၆ လုံးသာ ထည့်ပါ။" 
                    : "Please enter the last 6 digits of your transaction ID only."}
                </p>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {language === 'my' ? "ငွေပေးချေမှု ဓာတ်ပုံ" : "Payment Screenshot"}
                </Label>
                <Card className="border-dashed border-2 border-border/50">
                  <CardContent className="p-6 text-center">
                    {previewUrl ? (
                      <div className="space-y-3">
                        <img 
                          src={previewUrl} 
                          alt="Payment screenshot" 
                          className="max-h-64 mx-auto rounded-lg shadow-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScreenshot(null);
                            setPreviewUrl(null);
                          }}
                        >
                          {language === 'my' ? "ဖယ်ရှားရန်" : "Remove"}
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="font-medium text-foreground mb-1">
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
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {language === 'my' ? "တင်သွင်းနေသည်..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    {t('submit')}
                  </>
                )}
              </Button>

              {/* Deposit History */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold text-lg">
                    {language === 'my' ? "မကြာသေးမီ ငွေသွင်းမှုများ" : "Recent Deposits"}
                  </h2>
                </div>
                
                {isLoadingDeposits ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : deposits.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="py-8 text-center">
                      <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        {language === 'my' ? "ငွေသွင်းမှု မရှိသေးပါ" : "No deposits yet"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {deposits.map((deposit) => (
                      <Card key={deposit.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold">{Number(deposit.amount).toLocaleString()} Ks</p>
                            {getStatusBadge(deposit.status)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{format(new Date(deposit.created_at), 'MMM dd, yyyy • HH:mm')}</span>
                            {deposit.transaction_id && (
                              <span className="font-mono">ID: {deposit.transaction_id}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default TopUp;
