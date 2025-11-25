import { createContext, useContext, useState, ReactNode } from "react";

interface DownloadProgressContextType {
  isDownloading: boolean;
  progress: number;
  fileName: string;
  startDownload: (fileName: string) => void;
  updateProgress: (progress: number) => void;
  finishDownload: () => void;
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const DownloadProgressProvider = ({ children }: { children: ReactNode }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const startDownload = (fileName: string) => {
    setFileName(fileName);
    setProgress(0);
    setIsDownloading(true);
  };

  const updateProgress = (newProgress: number) => {
    setProgress(newProgress);
  };

  const finishDownload = () => {
    setProgress(100);
    setTimeout(() => {
      setIsDownloading(false);
      setProgress(0);
      setFileName("");
    }, 1000);
  };

  return (
    <DownloadProgressContext.Provider
      value={{
        isDownloading,
        progress,
        fileName,
        startDownload,
        updateProgress,
        finishDownload,
      }}
    >
      {children}
    </DownloadProgressContext.Provider>
  );
};

export const useDownloadProgress = () => {
  const context = useContext(DownloadProgressContext);
  if (context === undefined) {
    throw new Error("useDownloadProgress must be used within a DownloadProgressProvider");
  }
  return context;
};
