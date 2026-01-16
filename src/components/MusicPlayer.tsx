import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music2, SkipForward, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MusicPlayerProps {
  audioSrc: string;
  className?: string;
}

const MusicPlayer = ({ audioSrc, className }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <>
      <audio ref={audioRef} src={audioSrc} loop preload="auto" />
      
      <motion.div
        className={cn(
          "fixed z-50",
          className
        )}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ width: 64, height: 64, borderRadius: 32 }}
              animate={{ width: 280, height: "auto", borderRadius: 24 }}
              exit={{ width: 64, height: 64, borderRadius: 32 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="relative overflow-hidden"
            >
              {/* Glassmorphism Card */}
              <div className="relative p-4 bg-gradient-to-br from-card/95 via-card/90 to-card/85 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/20">
                {/* Animated gradient background */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  <motion.div
                    className="absolute -inset-[100%] bg-gradient-conic from-primary/30 via-purple-500/20 to-primary/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-card/98 via-card/95 to-card/90 backdrop-blur-xl" />
                </div>

                <div className="relative z-10">
                  {/* Top section with visualizer */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Vinyl disc animation */}
                    <motion.div
                      className="relative w-16 h-16 flex-shrink-0"
                      animate={isPlaying ? { rotate: 360 } : {}}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      {/* Outer ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg">
                        {/* Grooves */}
                        <div className="absolute inset-[4px] rounded-full border border-zinc-700/50" />
                        <div className="absolute inset-[8px] rounded-full border border-zinc-700/30" />
                        <div className="absolute inset-[12px] rounded-full border border-zinc-700/20" />
                        {/* Inner label */}
                        <div className="absolute inset-[16px] rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-background/80" />
                        </div>
                      </div>
                      {/* Shine effect */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                    </motion.div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <motion.p 
                        className="text-sm font-semibold text-foreground truncate"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        Gallery Vibes
                      </motion.p>
                      <motion.p 
                        className="text-xs text-muted-foreground truncate"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Kaung Computer
                      </motion.p>
                      
                      {/* Sound wave visualizer */}
                      <div className="flex items-end gap-[2px] mt-2 h-4">
                        {[...Array(16)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-primary to-primary/50"
                            animate={isPlaying ? {
                              height: [4, Math.random() * 12 + 4, 4],
                            } : { height: 4 }}
                            transition={{
                              duration: 0.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.05,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full relative"
                        style={{ width: `${progress}%` }}
                      >
                        {/* Glow effect on progress */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    {/* Like button */}
                    <motion.button
                      onClick={() => setIsLiked(!isLiked)}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart 
                        className={cn(
                          "h-5 w-5 transition-colors",
                          isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground hover:text-foreground"
                        )} 
                      />
                    </motion.button>

                    {/* Play/Pause - Center */}
                    <motion.button
                      onClick={togglePlay}
                      className={cn(
                        "relative w-14 h-14 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                        "shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50",
                        "transition-all duration-300"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Pulse rings when playing */}
                      {isPlaying && (
                        <>
                          <motion.span
                            className="absolute inset-0 rounded-full border-2 border-primary"
                            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                          />
                          <motion.span
                            className="absolute inset-0 rounded-full border border-primary/50"
                            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                          />
                        </>
                      )}
                      
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isPlaying ? "pause" : "play"}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ duration: 0.2 }}
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6 ml-1" />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </motion.button>

                    {/* Volume button */}
                    <motion.button
                      onClick={toggleMute}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </motion.button>
                  </div>

                  {/* Collapse hint */}
                  <motion.button
                    onClick={() => setIsExpanded(false)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-xs">×</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              onClick={() => setIsExpanded(true)}
              className="relative w-16 h-16 rounded-full overflow-hidden group"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {/* Animated gradient border */}
              <motion.div
                className="absolute inset-0 bg-gradient-conic from-primary via-purple-500 via-pink-500 via-primary to-primary"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Inner content */}
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl flex items-center justify-center">
                {/* Glow effect when playing */}
                {isPlaying && (
                  <motion.div
                    className="absolute inset-2 rounded-full bg-primary/20"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                )}
                
                {/* Sound wave / Music icon */}
                <div className="relative flex items-center justify-center">
                  {isPlaying ? (
                    <div className="flex items-end gap-[3px] h-6">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="w-[4px] bg-gradient-to-t from-primary to-purple-500 rounded-full"
                          animate={{
                            height: ["6px", "20px", "10px", "16px", "6px"],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Music2 className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <motion.div
                className={cn(
                  "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card",
                  isPlaying ? "bg-green-500" : "bg-muted"
                )}
                animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default MusicPlayer;