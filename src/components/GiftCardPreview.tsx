import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Heart, Star } from "lucide-react";

export interface GiftStyle {
  name: string;
  bg: string;
  color: string;
  accent: string; // hex/rgb for particles
  icon?: "sparkles" | "heart" | "star";
}

export const GIFT_STYLES: GiftStyle[] = [
  { name: "Sunset Bloom", bg: "linear-gradient(135deg,#ff9a8b,#ff6a88,#ff99ac,#ffb199)", color: "#fff", accent: "#fff7ad", icon: "heart" },
  { name: "Ocean Glow",   bg: "linear-gradient(135deg,#1e3c72,#2a5298,#4dd0e1,#1e3c72)", color: "#fff", accent: "#aef0ff", icon: "sparkles" },
  { name: "Galaxy",       bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e,#7f5af0)", color: "#fff", accent: "#c084fc", icon: "star" },
  { name: "Cherry Pop",   bg: "linear-gradient(135deg,#ff6e7f,#bfe9ff,#ff6e7f,#ffd6e0)", color: "#fff", accent: "#ffe066", icon: "heart" },
  { name: "Aurora",       bg: "linear-gradient(135deg,#00c6ff,#0072ff,#7f5af0,#00c6ff)", color: "#fff", accent: "#aef0ff", icon: "sparkles" },
  { name: "Peach Cream",  bg: "linear-gradient(135deg,#ffecd2,#fcb69f,#ffd6a5,#ffecd2)", color: "#5b3024", accent: "#ff8a5b", icon: "heart" },
  { name: "Mint Fresh",   bg: "linear-gradient(135deg,#a8edea,#fed6e3,#d4fc79,#a8edea)", color: "#0f3a36", accent: "#fff", icon: "sparkles" },
  { name: "Royal Velvet", bg: "linear-gradient(135deg,#7028e4,#e5b2ca,#9d4edd,#7028e4)", color: "#fff", accent: "#ffd6f5", icon: "star" },
  { name: "Gold Honey",   bg: "linear-gradient(135deg,#f7971e,#ffd200,#fbbf24,#f7971e)", color: "#5b3a00", accent: "#fff", icon: "sparkles" },
  { name: "Midnight Rose",bg: "linear-gradient(135deg,#0f2027,#203a43,#2c5364,#ff6e7f)", color: "#ffd6e0", accent: "#ff6e7f", icon: "heart" },
];

const IconFor = ({ name, className, style }: { name: GiftStyle["icon"]; className?: string; style?: React.CSSProperties }) => {
  if (name === "heart") return <Heart className={className} style={style} />;
  if (name === "star") return <Star className={className} style={style} />;
  return <Sparkles className={className} style={style} />;
};

interface Props {
  style: GiftStyle;
  message?: string;
  imageUrl?: string | null;
  variant?: "preview" | "full";
}

const GiftCardPreview = ({ style, message, imageUrl, variant = "preview" }: Props) => {
  const isFull = variant === "full";
  const Icon = style.icon ?? "sparkles";
  const prefersReducedMotion = useReducedMotion();
  const anim = (props: any) => (prefersReducedMotion ? { initial: false } : props);

  // Decorative particles positioned around the card
  const particles = [
    { top: "10%", left: "8%", size: 14, delay: 0 },
    { top: "20%", right: "10%", size: 18, delay: 0.6 },
    { bottom: "18%", left: "14%", size: 12, delay: 1.2 },
    { bottom: "12%", right: "16%", size: 16, delay: 1.8 },
    { top: "45%", left: "50%", size: 10, delay: 0.9 },
  ];

  return (
    <div
      className="relative gift-animated-bg overflow-hidden"
      style={{
        background: style.bg,
        color: style.color,
        minHeight: isFull ? 360 : 200,
        padding: isFull ? "2rem" : "1.5rem",
      }}
    >
      {/* Soft radial highlight */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 55%)" }} />

      {/* Shimmer sweep */}
      <div className="gift-shimmer-overlay" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="gift-float-particle absolute pointer-events-none"
          style={{
            top: p.top, left: p.left, right: p.right, bottom: p.bottom,
            color: style.accent,
            animationDelay: `${p.delay}s`,
          }}
        >
          <IconFor name={Icon} className="drop-shadow" style={{ width: p.size, height: p.size }} />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-center">
        {isFull && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center mb-4 ring-2 ring-white/30 shadow-xl"
          >
            <IconFor name={Icon} className="w-8 h-8" />
          </motion.div>
        )}

        {imageUrl && (
          <motion.img
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 160 }}
            src={imageUrl}
            alt="gift"
            className={`rounded-full object-cover border-[3px] border-white/50 shadow-2xl mb-3 ${isFull ? "w-28 h-28" : "w-20 h-20"}`}
          />
        )}

        {isFull && (
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-80 mb-2 font-semibold">
            ✦ A gift for you ✦
          </p>
        )}

        <div className={`font-bold ${isFull ? "text-base font-medium leading-relaxed" : "text-lg"}`}>
          {isFull ? null : style.name}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`whitespace-pre-wrap leading-relaxed ${isFull ? "text-base" : "text-sm opacity-95 mt-1 line-clamp-3"}`}
        >
          {message || (isFull ? "💝" : "Your gift message preview…")}
        </motion.div>
      </div>
    </div>
  );
};

export default GiftCardPreview;
