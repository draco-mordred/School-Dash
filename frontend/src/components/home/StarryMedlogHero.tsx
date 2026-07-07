import React, { useEffect, useMemo, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  tw: number;
};

type PointerState = {
  x: number;
  y: number;
  active: boolean;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export default function StarryMedlogHero() {
  const [isRevealed, setIsRevealed] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setIsRevealed(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  React.useEffect(() => {
    const detect = () => {
      try {
        if (document.documentElement.classList.contains("dark")) setTheme("dark");
        else if (document.documentElement.classList.contains("light")) setTheme("light");
        else setTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      } catch {
        setTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      }
    };
    detect();
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => detect();
    try {
      m.addEventListener("change", onChange);
    } catch {
      m.addListener(onChange);
    }
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      try {
        m.removeEventListener("change", onChange);
      } catch {
        m.removeListener(onChange);
      }
      obs.disconnect();
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<PointerState>({ x: 0.5, y: 0.5, active: false });
  const driftRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });
  const idleTimerRef = useRef<number | null>(null);
  const noiseRef = useRef(Math.random() * 1000);

  const stars = useMemo(() => {
    const rand = mulberry32(1337);
    const count = 900;
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: rand(),
        y: rand(),
        z: rand(),
        r: 0.5 + rand() * 1.6,
        tw: rand() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const resetIdle = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      pointerRef.current.active = true;
      idleTimerRef.current = window.setTimeout(() => {
        pointerRef.current.active = false;
      }, 1800);
    };

    const onMove = (event: PointerEvent) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerRef.current.x = clamp(x, 0, 1);
      pointerRef.current.y = clamp(y, 0, 1);
      resetIdle();
    };

    const onLeave = () => {
      pointerRef.current.active = false;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };

    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      tiltRef.current = {
        x: clamp(event.gamma / 30, -1, 1),
        y: clamp(event.beta / 30, -1, 1),
      };
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("deviceorientation", onTilt as EventListener);

    const t0 = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      const cs = getComputedStyle(document.documentElement);
      const g0 = cs.getPropertyValue("--hero-gradient-start") || (theme === "dark" ? "rgba(62,207,142,0.18)" : "rgba(96,165,250,0.12)");
      const g1 = cs.getPropertyValue("--hero-gradient-mid") || (theme === "dark" ? "rgba(62,207,142,0.08)" : "rgba(96,165,250,0.06)");
      const g2 = cs.getPropertyValue("--hero-gradient-end") || (theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)");
      grad.addColorStop(0, g0.trim());
      grad.addColorStop(0.35, g1.trim());
      grad.addColorStop(1, g2.trim());
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (pointerRef.current.active) {
        driftRef.current.x += (pointerRef.current.x - driftRef.current.x) * 0.16;
        driftRef.current.y += (pointerRef.current.y - driftRef.current.y) * 0.16;
      } else {
        driftRef.current.vx += (Math.sin(elapsed * 0.72 + noiseRef.current) * 0.0008 - driftRef.current.vx * 0.12);
        driftRef.current.vy += (Math.cos(elapsed * 0.68 + noiseRef.current) * 0.0008 - driftRef.current.vy * 0.12);
        driftRef.current.vx *= 0.96;
        driftRef.current.vy *= 0.96;
        driftRef.current.x = clamp(driftRef.current.x + driftRef.current.vx, 0.02, 0.98);
        driftRef.current.y = clamp(driftRef.current.y + driftRef.current.vy, 0.02, 0.98);
      }

      const focusX = clamp(driftRef.current.x + tiltRef.current.x * 0.08, 0.02, 0.98);
      const focusY = clamp(driftRef.current.y + tiltRef.current.y * 0.08, 0.02, 0.98);
      const mx = (focusX - 0.5) * 2;
      const my = (focusY - 0.5) * 2;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const px = mx * (1 - s.z) * 24;
        const py = my * (1 - s.z) * 18;
        const sx = (s.x * w + px * s.z) % w;
        const sy = (s.y * h + py * s.z) % h;
        const twinkle = pointerRef.current.active ? 0.65 + 0.25 * Math.sin(elapsed * 1.75 + s.tw) : 0.45 + 0.55 * Math.sin(elapsed * 2.35 + s.tw);
        const alpha = (0.15 + 0.85 * (1 - s.z)) * twinkle;
        const radius = s.r * dpr * (0.65 + (1 - s.z) * 0.9);

        ctx.beginPath();
        const starColor = cs.getPropertyValue("--hero-star-color") || (theme === "dark" ? "rgba(255,255,255,1)" : "rgba(30,64,175,0.9)");
        const sc = starColor.trim().replace(/rgba?\(([^)]+)\)/, (_m, p) => `rgba(${p.split(",").slice(0, 3).join(",")},${alpha.toFixed(3)})`);
        ctx.fillStyle = sc;
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (s.z > 0.55 && i % 3 === 0) {
          ctx.beginPath();
          const glow = cs.getPropertyValue("--hero-glow-color") || (theme === "dark" ? "rgba(62,207,142,0.18)" : "rgba(96,165,250,0.12)");
          const gl = glow.trim().replace(/rgba?\(([^)]+)\)/, (_m, p) => `rgba(${p.split(",").slice(0, 3).join(",")},${(alpha * 0.18).toFixed(3)})`);
          ctx.fillStyle = gl;
          ctx.arc(sx, sy, radius * 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("deviceorientation", onTilt as EventListener);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [stars, theme]);

  return (
    <section className="relative flex min-h-[calc(100vh-24px)] items-center overflow-hidden pb-16 pt-16">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
        {theme === "dark" ? <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-black" /> : <div className="absolute inset-0 bg-gradient-to-b from-white via-sky-50 to-sky-100" />}
      </div>
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isRevealed ? "opacity-90" : "opacity-0"}`}>
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.75)_100%)]" />

      <div className={`relative z-10 w-full transition-opacity duration-700 ${isRevealed ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className={`${theme === "dark" ? "text-white" : "text-gray-900"} text-4xl font-extrabold tracking-tight transition-all duration-700 sm:text-5xl md:text-7xl ${isRevealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
              Medlog LMS
            </h1>
            <p className={`${theme === "dark" ? "mt-5 text-gray-300/80" : "mt-5 text-gray-700"} mx-auto max-w-2xl text-base transition-all duration-700 sm:text-lg ${isRevealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
              A modern learning space for future-ready clinicians.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

