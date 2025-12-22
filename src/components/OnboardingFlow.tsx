import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, MessageCircle, Coins, Sparkles, Check, ChevronRight, X } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
  isOpen: boolean;
}

const slides = [
  {
    title: "Welcome to Premium",
    subtitle: "Unlock exclusive features",
    description: "Get the most out of your experience with our Premium membership - featuring verified badge, name changes, and chat-to-earn rewards!",
    icon: Crown,
    color: "from-yellow-400 to-amber-500",
    bgPattern: "radial-gradient(circle at 30% 20%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)",
  },
  {
    title: "Chat & Earn Points",
    subtitle: "Get rewarded for chatting",
    description: "Premium members earn points for every minute of active chatting. The longer your subscription, the more points per minute!",
    icon: MessageCircle,
    color: "from-emerald-400 to-teal-500",
    bgPattern: "radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)",
    benefits: [
      "1 Month: 5 points/min",
      "3 Months: 15 points/min",
      "6 Months: 25 points/min",
      "1 Year: 40 points/min",
    ],
  },
  {
    title: "Exchange Points",
    subtitle: "Turn points into rewards",
    description: "Redeem your earned points for real rewards including mobile top-ups, gift cards, and exclusive merchandise!",
    icon: Coins,
    color: "from-purple-400 to-violet-500",
    bgPattern: "radial-gradient(circle at 50% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
  },
  {
    title: "Verified Badge",
    subtitle: "Stand out from the crowd",
    description: "Premium members get a special blue verified badge next to their name, showing everyone you're a trusted member of our community!",
    icon: Sparkles,
    color: "from-blue-400 to-indigo-500",
    bgPattern: "radial-gradient(circle at 30% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
  },
];

const OnboardingFlow = ({ onComplete, isOpen }: OnboardingFlowProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const goToPrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Background pattern */}
        <div 
          className="absolute inset-0 opacity-50 transition-all duration-700"
          style={{ background: slide.bgPattern }}
        />

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: direction * 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-center max-w-md mx-auto"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.color} mx-auto mb-8 flex items-center justify-center shadow-xl`}
              >
                <Icon className="h-12 w-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-semibold text-primary uppercase tracking-wider mb-2"
              >
                {slide.subtitle}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-3xl font-display font-bold mb-4"
              >
                {slide.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground leading-relaxed mb-6"
              >
                {slide.description}
              </motion.p>

              {/* Benefits list if available */}
              {slide.benefits && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-2 text-left"
                >
                  {slide.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10"
                    >
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom section */}
        <div className="px-6 pb-8 space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentSlide ? 1 : -1);
                  setCurrentSlide(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={goToPrev}
                className="flex-1 h-12 rounded-xl"
              >
                Back
              </Button>
            )}
            <Button
              onClick={goToNext}
              className={`h-12 rounded-xl ${currentSlide === 0 ? "flex-1" : "flex-[2]"}`}
            >
              {isLast ? "Get Started" : "Continue"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingFlow;
