/**
 * Compress an image file to a small avatar (max 400x400, JPEG q=0.85).
 */
export const compressAvatar = (file: File | Blob, size = 400, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas unsupported"));
    img.onload = () => {
      const { width, height } = img;
      const ratio = Math.min(size / width, size / height, 1);
      const w = Math.round(width * ratio);
      const h = Math.round(height * ratio);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
};
