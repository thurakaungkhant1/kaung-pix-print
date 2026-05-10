import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ImageIcon, Heart, Gift, ArrowRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const features = [
  {
    to: "/ai/photo",
    icon: ImageIcon,
    title: "AI Photo Generator",
    description: "Create stunning AI-generated images from a prompt or photo.",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
  },
  {
    to: "/ai/invitation",
    icon: Heart,
    title: "Wedding Invitation",
    description: "Design beautiful AI-crafted wedding invitation cards.",
    gradient: "from-rose-500 via-pink-500 to-orange-400",
  },
  {
    to: "/ai/gift",
    icon: Gift,
    title: "Gift Link Creator",
    description: "Send animated AI gift links to friends & family.",
    gradient: "from-blue-500 via-indigo-500 to-purple-500",
  },
];

const AIHub = () => {
  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-20 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 px-5 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI Suite</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent mb-3">
            As You Like
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Create AI Photos, Wedding Invitations & Gift Links easily
          </p>
        </motion.div>

        <div className="space-y-4 max-w-md mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={f.to}
                className="block group relative overflow-hidden rounded-2xl p-5 bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative flex items-center gap-4">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg`}>
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AIHub;
