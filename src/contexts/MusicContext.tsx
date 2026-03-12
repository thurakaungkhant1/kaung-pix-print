import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";

interface MusicContextType {
  play: (src: string) => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  volume: number;
  currentSrc: string | null;
  progress: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(10);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.1;
    audioRef.current = audio;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.addEventListener("timeupdate", updateProgress);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = useCallback((src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (audio.src !== src && src) {
      // Only change source if different
      const currentTime = audio.currentTime;
      if (currentSrc === src) {
        // Same track, just resume
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
        return;
      }
      audio.src = src;
      audio.volume = volume / 100;
      setCurrentSrc(src);
    }
    
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentSrc, volume]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentSrc) {
      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying, currentSrc, pause]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
      audioRef.current.muted = v === 0;
    }
  }, []);

  return (
    <MusicContext.Provider value={{ play, pause, toggle, setVolume, isPlaying, volume, currentSrc, progress, audioRef }}>
      {children}
    </MusicContext.Provider>
  );
};
