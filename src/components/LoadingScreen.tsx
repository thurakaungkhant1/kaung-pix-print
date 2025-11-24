import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

const LoadingScreen = ({ onLoadComplete }: LoadingScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onLoadComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-primary transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">
          Kaung Computer
        </h1>
        <p className="text-lg text-primary-foreground/90">
          Photography & Printing
        </p>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-foreground" />
      </div>
    </div>
  );
};

export default LoadingScreen;
