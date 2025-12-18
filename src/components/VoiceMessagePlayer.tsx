import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  messageId: string;
  transcription?: string | null;
  isOwn: boolean;
}

const VoiceMessagePlayer = ({ 
  audioUrl, 
  messageId, 
  transcription: initialTranscription,
  isOwn 
}: VoiceMessagePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcription, setTranscription] = useState(initialTranscription);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [animationOffset, setAnimationOffset] = useState(0);

  // Generate stable waveform bar heights
  const waveformBars = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const random = seed - Math.floor(seed);
      return 25 + Math.sin(i * 0.5) * 20 + random * 25;
    });
  }, []);

  // Animation loop for waveform
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setAnimationOffset(prev => (prev + 0.15) % (Math.PI * 2));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * duration;
    
    audio.currentTime = newTime;
    setProgress(newProgress);
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (transcription || isTranscribing) return;
    
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioUrl, messageId }
      });

      if (error) throw error;
      
      setTranscription(data.transcription);
      setShowTranscription(true);
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Calculate animated height for each bar
  const getBarHeight = (baseHeight: number, index: number) => {
    if (!isPlaying) return baseHeight;
    
    // Create a wave effect that moves through the bars
    const wave = Math.sin(animationOffset + index * 0.3) * 15;
    const pulse = Math.sin(animationOffset * 2 + index * 0.2) * 8;
    
    return Math.max(15, Math.min(95, baseHeight + wave + pulse));
  };

  return (
    <div className="w-full max-w-[250px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg",
        isOwn ? "bg-primary-foreground/10" : "bg-background/50"
      )}>
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full shrink-0 transition-transform",
            isPlaying && "scale-95",
            isOwn 
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
              : "bg-primary/20 hover:bg-primary/30 text-primary"
          )}
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Waveform & Progress */}
        <div className="flex-1 space-y-1">
          <div 
            className="relative h-8 flex items-center gap-[2px] cursor-pointer"
            onClick={handleProgressClick}
          >
            {waveformBars.map((baseHeight, i) => {
              const barProgress = (i / waveformBars.length) * 100;
              const isActive = barProgress <= progress;
              const height = getBarHeight(baseHeight, i);
              
              return (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full",
                    isActive 
                      ? isOwn ? "bg-primary-foreground" : "bg-primary"
                      : isOwn ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
                  )}
                  style={{ 
                    height: `${height}%`,
                    transition: isPlaying ? 'none' : 'height 0.2s ease-out, background-color 0.15s ease'
                  }}
                />
              );
            })}
          </div>
          
          {/* Time Display */}
          <div className={cn(
            "flex justify-between text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Transcription Section */}
      <div className="mt-1">
        {!transcription && !isTranscribing && (
          <button
            onClick={handleTranscribe}
            className={cn(
              "text-[10px] underline",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            Transcribe
          </button>
        )}
        
        {isTranscribing && (
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing...
          </div>
        )}
        
        {transcription && (
          <div className="mt-1">
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className={cn(
                "text-[10px] underline",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {showTranscription ? 'Hide transcript' : 'Show transcript'}
            </button>
            
            {showTranscription && (
              <p className={cn(
                "text-xs mt-1 p-2 rounded italic",
                isOwn ? "bg-primary-foreground/10 text-primary-foreground/90" : "bg-muted/50 text-foreground/80"
              )}>
                {transcription}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
