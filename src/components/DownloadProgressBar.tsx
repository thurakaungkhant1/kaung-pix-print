import { useDownloadProgress } from "@/contexts/DownloadProgressContext";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";

const DownloadProgressBar = () => {
  const { isDownloading, progress, fileName } = useDownloadProgress();

  if (!isDownloading) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-medium">Downloading {fileName}</span>
          </div>
          <span className="text-muted-foreground font-semibold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
};

export default DownloadProgressBar;
