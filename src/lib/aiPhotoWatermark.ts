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
 * Overlays the KAUNG logo + small "kaung" text on the bottom-right corner.
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

  // Logo sized to ~9% of image width — visible but not overpowering
  const logoSize = Math.max(56, Math.round(canvas.width * 0.09));
  const margin = Math.round(canvas.width * 0.025);

  // Text "kaung" beside the logo
  const fontSize = Math.round(logoSize * 0.42);
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  const text = "kaung";
  const textWidth = ctx.measureText(text).width;
  const gap = Math.round(logoSize * 0.18);

  const totalW = logoSize + gap + textWidth;
  const x = canvas.width - totalW - margin;
  const y = canvas.height - logoSize - margin;

  // Soft shadow for legibility
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.round(logoSize * 0.18);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(logo, x, y, logoSize, logoSize);
  ctx.restore();

  // "kaung" text — white with subtle shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.round(fontSize * 0.5);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + logoSize + gap, y + logoSize / 2 + fontSize * 0.05);
  ctx.restore();

  return canvas.toDataURL("image/png");
};
