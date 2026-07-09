import React, { useRef, useEffect } from "react";

// Canvas-based starfield with soft Brownian motion and cursor-follow behavior.
// - Each star moves independently with small random walk when idle.
// - When the pointer moves, stars are attracted toward the pointer position.

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

const STAR_COUNT = 80;
const MAX_SPEED = 0.6;
const ATTRACT_STRENGTH = 0.06; // how strongly stars follow cursor
const BROWNIAN_AMOUNT = 0.12;

const HeroStars: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const pointerRef = useRef<{ x: number; y: number; time: number; moving: boolean }>({ x: 0, y: 0, time: 0, moving: false });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    resize();

    const initStars = () => {
      starsRef.current = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const r = Math.random() * 1.5 + 0.6;
        starsRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * MAX_SPEED,
          vy: (Math.random() - 0.5) * MAX_SPEED,
          r,
          alpha: 0.4 + Math.random() * 0.6,
        });
      }
    };

    initStars();

    let lastTime = performance.now();

    const update = (now: number) => {
      const dt = Math.min(40, now - lastTime) / 16.67; // normalize to ~60fps
      lastTime = now;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // compute whether pointer is active and moving
      const elapsedSincePointer = now - pointerRef.current.time;
      const pointerActive = elapsedSincePointer < 1200; // pointer considered active for 1.2s after last move
      const pointerMoving = pointerRef.current.moving && pointerActive;

      for (const s of starsRef.current) {
        if (pointerMoving) {
          // attract toward cursor
          const dx = pointerRef.current.x - s.x;
          const dy = pointerRef.current.y - s.y;
          s.vx += dx * (ATTRACT_STRENGTH * (0.7 + Math.random() * 0.6)) * dt;
          s.vy += dy * (ATTRACT_STRENGTH * (0.7 + Math.random() * 0.6)) * dt;
        } else {
          // Brownian motion small random walk
          s.vx += (Math.random() - 0.5) * BROWNIAN_AMOUNT * dt;
          s.vy += (Math.random() - 0.5) * BROWNIAN_AMOUNT * dt;
        }

        // clamp speed
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (speed > MAX_SPEED * 2) {
          s.vx = (s.vx / speed) * MAX_SPEED * 2;
          s.vy = (s.vy / speed) * MAX_SPEED * 2;
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;

        // wrap-around
        if (s.x < -20) s.x = width + 20;
        if (s.x > width + 20) s.x = -20;
        if (s.y < -20) s.y = height + 20;
        if (s.y > height + 20) s.y = -20;

        // twinkle alpha
        s.alpha += (Math.random() - 0.5) * 0.06 * dt;
        s.alpha = Math.max(0.2, Math.min(1, s.alpha));

        // draw glow
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, `rgba(255,255,255,${0.12 * s.alpha})`);
        g.addColorStop(0.25, `rgba(200,220,255,${0.10 * s.alpha})`);
        g.addColorStop(1, `rgba(200,220,255,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();

        // draw core
        ctx.fillStyle = `rgba(255,255,255,${0.9 * s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = e.clientX - rect.left;
      pointerRef.current.y = e.clientY - rect.top;
      pointerRef.current.time = performance.now();
      pointerRef.current.moving = true;

      // mark moving false shortly after
      setTimeout(() => {
        pointerRef.current.moving = false;
      }, 70);
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        pointerRef.current.x = e.touches[0].clientX - rect.left;
        pointerRef.current.y = e.touches[0].clientY - rect.top;
        pointerRef.current.time = performance.now();
        pointerRef.current.moving = true;
        setTimeout(() => {
          pointerRef.current.moving = false;
        }, 70);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className || "absolute inset-0 -z-10 w-full h-full pointer-events-none"}
      aria-hidden
    />
  );
};

export default HeroStars;
