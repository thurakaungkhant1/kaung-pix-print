import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Play, Pause, Loader2, Volume2, VolumeX, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  messageId: string;
  transcription?: string | null;
  isOwn: boolean;
}

// Helper to extract file path from signed URL
const extractFilePath = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/chat-voices\/(.+)/);
    return pathMatch ? pathMatch[1].split('?')[0] : null;
  } catch {
    return null;
  }
};

// Check if signed URL is expired or about to expire (within 5 minutes)
const isUrlExpired = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (!token) return true;
    
    // Decode JWT to check expiration (JWT is base64 encoded)
    const payload = token.split('.')[1];
    if (!payload) return true;
    
    const decoded = JSON.parse(atob(payload));
    const expTime = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return now >= (expTime - fiveMinutes);
  } catch {
    return true; // If we can't parse, assume expired
  }
};

const VoiceMessagePlayer = ({ 
  audioUrl: initialAudioUrl, 
  messageId, 
  transcription: initialTranscription,
  isOwn 
}: VoiceMessagePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcription, setTranscription] = useState(initialTranscription);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [animationOffset, setAnimationOffset] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Refresh signed URL if expired
  const refreshSignedUrl = useCallback(async (showToast = true): Promise<string | null> => {
    const filePath = extractFilePath(initialAudioUrl);
    if (!filePath) return null;

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.storage
        .from('chat-voices')
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error || !data?.signedUrl) {
        console.error('Failed to refresh signed URL:', error);
        if (showToast) {
          toast({
            title: "Playback error",
            description: "Unable to load voice message. Please try again.",
            variant: "destructive",
          });
        }
        return null;
      }

      setAudioUrl(data.signedUrl);
      setLoadError(false);
      
      if (showToast) {
        toast({
          title: "Voice message ready",
          description: "Audio link refreshed. Tap play to listen.",
        });
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error refreshing URL:', error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [initialAudioUrl, toast]);

  // Check and refresh URL on mount (silently, no toast)
  useEffect(() => {
    if (isUrlExpired(audioUrl)) {
      refreshSignedUrl(false);
    }
  }, []);

  // Click outside handler for volume slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowVolume(false);
      }
    };

    if (showVolume) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolume]);

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

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Check if URL is expired before playing
      if (isUrlExpired(audioUrl) || loadError) {
        const newUrl = await refreshSignedUrl();
        if (newUrl && audioRef.current) {
          audioRef.current.src = newUrl;
          audioRef.current.load();
        } else {
          return; // Can't play without valid URL
        }
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback failed:', error);
        // Try refreshing URL on playback error
        const newUrl = await refreshSignedUrl();
        if (newUrl && audioRef.current) {
          audioRef.current.src = newUrl;
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch {
            setLoadError(true);
          }
        }
      }
    }
  };

  // Handle audio load errors (expired URL)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = async () => {
      console.log('Audio load error, attempting to refresh URL');
      setLoadError(true);
      await refreshSignedUrl();
    };

    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, [refreshSignedUrl]);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-message-${messageId.slice(0, 8)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
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
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : loadError ? (
            <RefreshCw className="h-5 w-5" />
          ) : isPlaying ? (
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

        {/* Volume Control */}
        <div ref={volumeRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0",
              isOwn 
                ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => setShowVolume(!showVolume)}
            onDoubleClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          {showVolume && (
            <div className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-lg shadow-lg z-10",
              isOwn ? "bg-primary" : "bg-card border border-border"
            )}>
              <div className="h-20 flex flex-col items-center gap-2">
                <Slider
                  orientation="vertical"
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="h-16"
                />
                <span className={cn(
                  "text-[10px]",
                  isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Download Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0",
            isOwn 
              ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          onClick={handleDownload}
          title="Download voice message"
        >
          <Download className="h-4 w-4" />
        </Button>
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
