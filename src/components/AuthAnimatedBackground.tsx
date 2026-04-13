import { useEffect, useRef } from "react";

const AuthAnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number; y: number; size: number; speedX: number; speedY: number; opacity: number; hue: number;
    }> = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w(),
        y: Math.random() * h(),
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() * 30 + 155, // teal range
      });
    }

    let time = 0;

    const draw = () => {
      time += 0.005;
      ctx.clearRect(0, 0, w(), h());

      // Animated gradient blobs
      const blob1X = w() * 0.3 + Math.sin(time) * w() * 0.15;
      const blob1Y = h() * 0.3 + Math.cos(time * 0.7) * h() * 0.1;
      const blob2X = w() * 0.7 + Math.cos(time * 0.8) * w() * 0.12;
      const blob2Y = h() * 0.7 + Math.sin(time * 0.6) * h() * 0.15;
      const blob3X = w() * 0.5 + Math.sin(time * 1.1) * w() * 0.2;
      const blob3Y = h() * 0.5 + Math.cos(time * 0.9) * h() * 0.12;

      // Blob 1 - primary
      const grad1 = ctx.createRadialGradient(blob1X, blob1Y, 0, blob1X, blob1Y, w() * 0.35);
      grad1.addColorStop(0, "hsla(168, 76%, 36%, 0.12)");
      grad1.addColorStop(1, "hsla(168, 76%, 36%, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w(), h());

      // Blob 2 - accent
      const grad2 = ctx.createRadialGradient(blob2X, blob2Y, 0, blob2X, blob2Y, w() * 0.3);
      grad2.addColorStop(0, "hsla(15, 90%, 60%, 0.08)");
      grad2.addColorStop(1, "hsla(15, 90%, 60%, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w(), h());

      // Blob 3 - subtle
      const grad3 = ctx.createRadialGradient(blob3X, blob3Y, 0, blob3X, blob3Y, w() * 0.25);
      grad3.addColorStop(0, "hsla(168, 50%, 50%, 0.06)");
      grad3.addColorStop(1, "hsla(168, 50%, 50%, 0)");
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, w(), h());

      // Floating particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = w();
        if (p.x > w()) p.x = 0;
        if (p.y < 0) p.y = h();
        if (p.y > h()) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 50%, ${p.opacity})`;
        ctx.fill();
      });

      // Connection lines between close particles
      ctx.strokeStyle = "hsla(168, 60%, 40%, 0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Floating grid dots
      ctx.fillStyle = "hsla(168, 40%, 50%, 0.04)";
      const gridSize = 40;
      const offsetX = (time * 10) % gridSize;
      const offsetY = (time * 5) % gridSize;
      for (let x = -gridSize + offsetX; x < w() + gridSize; x += gridSize) {
        for (let y = -gridSize + offsetY; y < h() + gridSize; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

export default AuthAnimatedBackground;
