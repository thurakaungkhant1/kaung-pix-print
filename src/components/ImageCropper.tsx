import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper = ({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
}: ImageCropperProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) return null;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return offscreen.convertToBlob({
      type: "image/jpeg",
      quality: 0.9,
    });
  }, [completedCrop]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Crop Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div className="relative flex items-center justify-center bg-muted/50 rounded-xl overflow-hidden min-h-[300px] max-h-[400px]">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[400px] w-auto"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Rotate */}
            <div className="flex items-center gap-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[rotate]}
                onValueChange={([v]) => setRotate(v)}
                min={-180}
                max={180}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {rotate}°
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 sm:flex-none"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing || !completedCrop}
            className={cn(
              "flex-1 sm:flex-none gap-2",
              "bg-primary hover:bg-primary/90"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
