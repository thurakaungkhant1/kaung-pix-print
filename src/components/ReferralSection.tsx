import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users } from "lucide-react";

const ReferralSection = () => {
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referralPoints, setReferralPoints] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    // Get referral code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    if (profile) {
      setReferralCode(profile.referral_code);
    }

    // Count referrals
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id);

    setReferralCount(count || 0);

    // Calculate points earned from referrals
    const { data: transactions } = await supabase
      .from("point_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", "referral");

    if (transactions) {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      setReferralPoints(total);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/auth/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const shareReferral = async () => {
    const referralLink = `${window.location.origin}/auth/signup?ref=${referralCode}`;
    const shareText = `Join Kaung Computer using my referral code and get bonus points! Use code: ${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Kaung Computer",
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled share or error occurred
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Refer a Friend
        </CardTitle>
        <CardDescription>
          Share your referral code and earn 10 points for each friend who signs up!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg font-bold"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralLink}
              title="Copy referral link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={shareReferral}
          className="w-full"
          size="lg"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share Referral Link
        </Button>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{referralCount}</p>
            <p className="text-sm text-muted-foreground">Friends Referred</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{referralPoints}</p>
            <p className="text-sm text-muted-foreground">Points Earned</p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Share your unique referral code with friends</li>
            <li>• They enter your code during signup</li>
            <li>• You get 10 points, they get 5 points!</li>
            <li>• Unlimited referrals, unlimited rewards</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
