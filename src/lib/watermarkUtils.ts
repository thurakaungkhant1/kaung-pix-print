export const addWatermark = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Configure watermark
      const fontSize = Math.max(img.width * 0.04, 16);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      
      // Draw watermark at bottom center
      const text = "kaungcomputer.com";
      const x = canvas.width / 2;
      const y = canvas.height - 20;
      
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      
      // Convert to data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageUrl;
  });
};
