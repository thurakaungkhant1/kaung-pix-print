import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const AIInvitation = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ai" className="p-2 -ml-2 rounded-full hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold flex-1">Wedding Invitation</h1>
        </div>
      </header>

      <div className="px-5 py-12 max-w-md mx-auto text-center">
        <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 items-center justify-center mb-6 shadow-xl">
          <Heart className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Coming Soon</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Design beautiful AI-crafted wedding invitation cards with multiple style previews.
        </p>
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3" /> In development
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AIInvitation;
