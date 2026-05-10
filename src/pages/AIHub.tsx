import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ImageIcon, Wand2, Gift, ArrowRight, IdCard } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const features = [
  { to: "/ai/photo", icon: ImageIcon, title: "AI Photo Generator", description: "Create stunning AI-generated images from a prompt or photo. 5 free / day.", gradient: "from-purple-500 via-fuchsia-500 to-pink-500", glow: "shadow-purple-500/30" },
  { to: "/ai/passport", icon: IdCard, title: "Passport Photo Maker", description: "Pick a sample style, upload your photo, get a perfect portrait.", gradient: "from-emerald-500 via-teal-500 to-cyan-500", glow: "shadow-emerald-500/30" },
  { to: "/ai/prompts", icon: Wand2, title: "Popular Prompts", description: "Browse trending image prompts. Copy & generate instantly.", gradient: "from-rose-500 via-pink-500 to-orange-400", glow: "shadow-pink-500/30" },
  { to: "/ai/gift", icon: Gift, title: "Gift Link Creator", description: "Send animated AI gift links to friends & family.", gradient: "from-blue-500 via-indigo-500 to-purple-500", glow: "shadow-indigo-500/30" },
];

const ctas = [
  { to: "/ai/photo", label: "Generate Photo", from: "from-purple-500", to_: "to-pink-500" },
  { to: "/ai/passport", label: "Passport Photo", from: "from-emerald-500", to_: "to-teal-500" },
  { to: "/ai/prompts", label: "Popular Prompts", from: "from-rose-500", to_: "to-orange-400" },
  { to: "/ai/gift", label: "Gift Link", from: "from-blue-500", to_: "to-indigo-500" },
];

const AIHub = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-purple-500/25 blur-3xl" />
        <motion.div animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} className="absolute top-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-pink-500/25 blur-3xl" />
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-blue-500/25 blur-3xl" />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -120] }} transition={{ duration: 6 + i, repeat: Infinity, delay: i * 1.2 }} className="absolute w-1.5 h-1.5 rounded-full bg-white/60" style={{ left: `${10 + i * 15}%`, top: `${50 + (i % 3) * 10}%` }} />
        ))}
      </div>

      <div className="relative z-10 px-5 pt-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8 max-w-md mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 border border-primary/20 mb-5 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">AI Suite</span>
          </motion.div>
          <h1 className="text-5xl font-extrabold leading-tight bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent mb-3 tracking-tight">As You Like</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">Generate AI Photos, browse Popular Prompts & send Gift Links.</p>

          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }} className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {ctas.map((c) => (
              <motion.div key={c.to} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <Link to={c.to} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${c.from} ${c.to_} shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95`}>
                  <Sparkles className="w-3 h-3" /> {c.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Feature cards */}
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } } }} className="space-y-4 max-w-md mx-auto">
          {features.map((f) => (
            <motion.div key={f.to} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <Link to={f.to} className={`block group relative overflow-hidden rounded-2xl p-5 bg-card/50 backdrop-blur-xl border border-border/50 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${f.glow} active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <div className="relative flex items-center gap-4">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
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
        </motion.div>
      </div>

      <BottomNav />
    </motion.div>
  );
};

export default AIHub;
