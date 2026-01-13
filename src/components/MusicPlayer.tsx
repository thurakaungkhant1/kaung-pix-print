import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music2 } from "lucide-react";
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
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ width: 56, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 56, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative overflow-hidden"
            >
              {/* Expanded Player */}
              <div className="flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-2 py-1.5 shadow-xl shadow-primary/10">
                {/* Play/Pause Button */}
                <motion.button
                  onClick={togglePlay}
                  className={cn(
                    "relative w-10 h-10 rounded-full flex items-center justify-center",
                    "transition-all duration-300 btn-press",
                    isPlaying 
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Animated rings when playing */}
                  {isPlaying && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-primary/50"
                        animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-primary/30"
                        animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
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
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>

                {/* Progress bar */}
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Mute Button */}
                <motion.button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </motion.button>

                {/* Collapse Button */}
                <motion.button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                >
                  <Music2 className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              onClick={() => setIsExpanded(true)}
              className={cn(
                "relative w-14 h-14 rounded-full flex items-center justify-center",
                "bg-card/95 backdrop-blur-xl border border-border/50",
                "shadow-xl shadow-primary/10 hover:shadow-2xl hover:shadow-primary/20",
                "transition-all duration-300 btn-press"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Animated background when playing */}
              {isPlaying && (
                <motion.div
                  className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/20 to-primary/5"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
              )}
              
              {/* Sound wave animation when playing */}
              <div className="relative flex items-center justify-center gap-0.5">
                {isPlaying ? (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        animate={{
                          height: ["8px", "16px", "8px"],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <Music2 className="h-6 w-6 text-primary" />
                )}
              </div>

              {/* Playing indicator dot */}
              {isPlaying && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default MusicPlayer;
