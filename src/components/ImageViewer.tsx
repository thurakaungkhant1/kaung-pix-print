import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageViewer = ({ src, alt = "Image", open, onOpenChange }: ImageViewerProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 border-0">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Controls */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button
                  onClick={() => zoomIn()}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                >
                  <ZoomIn className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                >
                  <ZoomOut className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                >
                  <RotateCcw className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors ml-2"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Hint text */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <p className="text-white/60 text-xs text-center">
                  Pinch or scroll to zoom • Drag to pan
                </p>
              </div>

              {/* Image */}
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
