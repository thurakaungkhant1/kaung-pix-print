import { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Music2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useMusic } from "@/contexts/MusicContext";

interface MusicPlayerProps {
  audioSrc: string;
  className?: string;
  autoPlay?: boolean;
}

const MusicPlayer = ({ audioSrc, className, autoPlay = false }: MusicPlayerProps) => {
  const { play, pause, toggle, setVolume: setGlobalVolume, isPlaying, volume, progress } = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Auto-play on mount
  if (autoPlay && audioSrc && !hasAutoPlayed) {
    setHasAutoPlayed(true);
    // Use setTimeout to avoid calling during render
    setTimeout(() => play(audioSrc), 100);
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play(audioSrc);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setGlobalVolume(volume || 10);
      setIsMuted(false);
    } else {
      setGlobalVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setGlobalVolume(newVolume);
    if (newVolume === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  return (
    <motion.div
      className={cn("fixed z-50", className)}
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
            <div className="relative p-4 bg-gradient-to-br from-card/95 via-card/90 to-card/85 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/20">
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <motion.div
                  className="absolute -inset-[100%] bg-gradient-conic from-primary/30 via-purple-500/20 to-primary/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-card/98 via-card/95 to-card/90 backdrop-blur-xl" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className="relative w-16 h-16 flex-shrink-0"
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg">
                      <div className="absolute inset-[4px] rounded-full border border-zinc-700/50" />
                      <div className="absolute inset-[8px] rounded-full border border-zinc-700/30" />
                      <div className="absolute inset-[12px] rounded-full border border-zinc-700/20" />
                      <div className="absolute inset-[16px] rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-background/80" />
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <motion.p className="text-sm font-semibold text-foreground truncate" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                      Gallery Vibes
                    </motion.p>
                    <motion.p className="text-xs text-muted-foreground truncate" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                      Kaung Computer
                    </motion.p>
                    <div className="flex items-end gap-[2px] mt-2 h-4">
                      {[...Array(16)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-[3px] rounded-full bg-gradient-to-t from-primary to-primary/50"
                          animate={isPlaying ? { height: [4, Math.random() * 12 + 4, 4] } : { height: 4 }}
                          transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                    </motion.div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <motion.button onClick={() => setIsLiked(!isLiked)} className="w-10 h-10 rounded-full flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                    <Heart className={cn("h-5 w-5 transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground hover:text-foreground")} />
                  </motion.button>

                  <motion.button
                    onClick={togglePlay}
                    className={cn(
                      "relative w-14 h-14 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                      "shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying && (
                      <>
                        <motion.span className="absolute inset-0 rounded-full border-2 border-primary" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }} />
                        <motion.span className="absolute inset-0 rounded-full border border-primary/50" animate={{ scale: [1, 1.8], opacity: [0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }} />
                      </>
                    )}
                    <AnimatePresence mode="wait">
                      <motion.div key={isPlaying ? "pause" : "play"} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>

                  <div className="relative">
                    <motion.button
                      onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </motion.button>
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl"
                          onMouseEnter={() => setShowVolumeSlider(true)}
                          onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{volume}%</span>
                            <div className="h-24 flex items-center">
                              <Slider orientation="vertical" value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="h-full" />
                            </div>
                            <motion.button onClick={toggleMute} className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors" whileTap={{ scale: 0.9 }}>
                              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-foreground" />}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

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
            <motion.div
              className="absolute inset-0 bg-gradient-conic from-primary via-purple-500 via-pink-500 via-primary to-primary"
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl flex items-center justify-center">
              {isPlaying && (
                <motion.div
                  className="absolute inset-2 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div className="relative flex items-center justify-center">
                {isPlaying ? (
                  <div className="flex items-end gap-[3px] h-6">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-[4px] bg-gradient-to-t from-primary to-purple-500 rounded-full"
                        animate={{ height: ["6px", "20px", "10px", "16px", "6px"] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music2 className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                )}
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MusicPlayer;
