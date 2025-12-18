import { useEffect } from "react";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onSend: (blob: Blob) => Promise<void>;
  onCancel: () => void;
  isUploading: boolean;
}

const VoiceRecorder = ({ onSend, onCancel, isUploading }: VoiceRecorderProps) => {
  const { 
    isRecording, 
    recordingTime, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    cancelRecording 
  } = useVoiceRecorder();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSend = async () => {
    if (audioBlob) {
      await onSend(audioBlob);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording().catch(console.error);
  }, []);

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 shrink-0 text-destructive hover:text-destructive"
        onClick={handleCancel}
        disabled={isUploading}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Recording indicator */}
      <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-muted rounded-full">
        {isRecording ? (
          <>
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            </div>
            <span className="text-sm font-medium text-destructive">
              Recording {formatTime(recordingTime)}
            </span>
            <div className="flex-1 flex items-center gap-0.5">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-destructive/60 rounded-full transition-all duration-100",
                    isRecording && "animate-pulse"
                  )}
                  style={{
                    height: `${Math.random() * 16 + 4}px`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </>
        ) : audioBlob ? (
          <>
            <Mic className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Voice message ready ({formatTime(recordingTime)})
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Initializing...</span>
        )}
      </div>

      {/* Stop / Send button */}
      {isRecording ? (
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      ) : audioBlob ? (
        <Button
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      ) : null}
    </div>
  );
};

export default VoiceRecorder;
