import { useState, useEffect } from "react";
import { Wallet, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopUpDialog from "./TopUpDialog";
import { useNavigate } from "react-router-dom";

const WalletDisplay = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBalance();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('wallet-balance')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new && typeof payload.new.wallet_balance === 'number') {
              setBalance(payload.new.wallet_balance);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('my-MM', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' Ks';
  };

  if (!user) return null;

  return (
    <>
      <div className="card-neon p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">My Wallet</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/wallet-history')}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mb-4">
          <p className="text-2xl font-bold text-neon">
            {loading ? '...' : formatCurrency(balance)}
          </p>
          <p className="text-xs text-muted-foreground">Available Balance</p>
        </div>

        <Button 
          onClick={() => setIsTopUpOpen(true)}
          className="w-full btn-neon"
        >
          <Plus className="h-4 w-4 mr-2" />
          Top Up / ငွေသွင်းမည်
        </Button>
      </div>

      <TopUpDialog 
        open={isTopUpOpen} 
        onOpenChange={setIsTopUpOpen}
        onSuccess={loadBalance}
      />
    </>
  );
};

export default WalletDisplay;
