import { useEffect, useRef } from "react";

/**
 * High performance canvas-based floating hearts particle background generator.
 * Emits romantic elements rising gracefully from the bottom.
 */
export default function FloatingHearts() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      opacity: number;
      wobble: number;
      wobbleSpeed: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Spawn a new heart particle
    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 40,
        size: Math.random() * 15 + 10,
        speedY: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      };
    };

    // Initialize initial particles spreading across the height
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 15 + 10,
        speedY: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Canvas drawing helper for heart path
    const drawHeart = (context: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = "#9d4edd"; // Neon magenta/purple tint
      context.shadowColor = "#00d2ff"; // Neon cyan shadow overlay
      context.shadowBlur = 10;
      context.beginPath();
      
      const topCurveHeight = size * 0.3;
      context.moveTo(x, y + topCurveHeight);
      
      // Top left curve
      context.bezierCurveTo(
        x - size / 2, y - topCurveHeight,
        x - size, y + topCurveHeight,
        x, y + size
      );
      
      // Top right curve
      context.bezierCurveTo(
        x + size, y + topCurveHeight,
        x + size / 2, y - topCurveHeight,
        x, y + topCurveHeight
      );
      
      context.fill();
      context.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Randomly spawn more hearts
      if (particles.length < 50 && Math.random() < 0.05) {
        particles.push(createParticle());
      }

      particles.forEach((p, index) => {
        p.y -= p.speedY;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.3;

        // Draw particle
        drawHeart(ctx, p.x, p.y, p.size, p.opacity);

        // Recycle particles that drifted off screen
        if (p.y < -40) {
          particles[index] = createParticle();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      id="floating-hearts-canvas"
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
}
