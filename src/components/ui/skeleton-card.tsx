import { cn } from "@/lib/utils";
import React from "react";

interface SkeletonCardProps {
  className?: string;
  variant?: "product" | "photo" | "horizontal";
  style?: React.CSSProperties;
}

export const SkeletonCard = ({ className, variant = "product", style }: SkeletonCardProps) => {
  if (variant === "horizontal") {
    return (
      <div 
        className={cn(
          "flex-shrink-0 w-40 overflow-hidden rounded-2xl border border-border/30 bg-card",
          className
        )}
        style={style}
      >
        <div className="aspect-square bg-muted animate-shimmer rounded-t-2xl" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-muted animate-shimmer rounded w-full" />
          <div className="h-4 bg-muted animate-shimmer rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (variant === "photo") {
    return (
      <div 
        className={cn(
          "overflow-hidden rounded-xl border border-border/30 bg-card",
          className
        )}
        style={style}
      >
        <div className="aspect-square bg-muted animate-shimmer rounded-t-xl" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-muted animate-shimmer rounded w-16" />
          <div className="h-4 bg-muted animate-shimmer rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "overflow-hidden rounded-xl border border-border/30 bg-card",
        className
      )}
      style={style}
    >
      <div className="aspect-square bg-muted animate-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted animate-shimmer rounded w-full" />
        <div className="h-4 bg-muted animate-shimmer rounded w-1/2" />
        <div className="h-8 bg-muted animate-shimmer rounded w-full mt-2" />
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ 
  count = 6, 
  columns = 2,
  variant = "product" 
}: { 
  count?: number; 
  columns?: 2 | 3;
  variant?: "product" | "photo";
}) => {
  const gridClass = columns === 3 ? "grid-cols-3" : "grid-cols-2";
  
  return (
    <div className={cn("grid gap-3", gridClass)}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard 
          key={i} 
          variant={variant}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
};

export const SkeletonHorizontalList = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard 
          key={i} 
          variant="horizontal"
          className="animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
};