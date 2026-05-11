import logoUrl from "@/assets/kaung-watermark.png";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image: " + src));
    img.src = src;
  });

/**
 * Overlays the small KAUNG COMPUTER logo on the bottom-right corner of an image.
 * Returns a data URL (PNG) of the watermarked result.
 */
export const addLogoWatermark = async (imageUrl: string): Promise<string> => {
  const [base, logo] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.drawImage(base, 0, 0);

  // Logo sized to ~22% of image width, kept compact
  const logoW = Math.max(120, Math.round(canvas.width * 0.22));
  const ratio = logo.naturalHeight / logo.naturalWidth;
  const logoH = Math.round(logoW * ratio);

  const margin = Math.round(canvas.width * 0.025);
  const x = canvas.width - logoW - margin;
  const y = canvas.height - logoH - margin;

  // Subtle dark backdrop for legibility on light images
  const padX = Math.round(logoW * 0.08);
  const padY = Math.round(logoH * 0.25);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  const radius = Math.round(logoH * 0.4);
  const bx = x - padX, by = y - padY, bw = logoW + padX * 2, bh = logoH + padY * 2;
  ctx.beginPath();
  ctx.moveTo(bx + radius, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, radius);
  ctx.arcTo(bx + bw, by + bh, bx, by + bh, radius);
  ctx.arcTo(bx, by + bh, bx, by, radius);
  ctx.arcTo(bx, by, bx + bw, by, radius);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.95;
  // Invert logo color to white via composite for visibility on dark backdrop
  ctx.save();
  ctx.drawImage(logo, x, y, logoW, logoH);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(x, y, logoW, logoH);
  ctx.restore();
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
};
