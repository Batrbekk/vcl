"use client";

import { useEffect, useRef } from "react";

type OrbState = "idle" | "listening" | "speaking";

interface VoiceOrbProps {
  state: OrbState;
  volume: number; // 0-1
}

const STATE_COLORS: Record<OrbState, { core: string; glow: string; ring: string }> = {
  idle: {
    core: "rgba(99, 102, 241, 0.9)",   // indigo-500
    glow: "rgba(99, 102, 241, 0.25)",
    ring: "rgba(99, 102, 241, 0.15)",
  },
  listening: {
    core: "rgba(34, 197, 94, 0.9)",     // green-500
    glow: "rgba(34, 197, 94, 0.25)",
    ring: "rgba(34, 197, 94, 0.15)",
  },
  speaking: {
    core: "rgba(59, 130, 246, 0.9)",    // blue-500
    glow: "rgba(59, 130, 246, 0.25)",
    ring: "rgba(59, 130, 246, 0.15)",
  },
};

export function VoiceOrb({ state, volume }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const smoothVolumeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const baseRadius = 50;

    function draw() {
      if (!ctx) return;
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Smooth volume transition
      smoothVolumeRef.current += (volume - smoothVolumeRef.current) * 0.15;
      const vol = smoothVolumeRef.current;

      const colors = STATE_COLORS[state];

      ctx.clearRect(0, 0, size, size);

      // Draw outer rings (4 rings expanding based on volume)
      const ringCount = 4;
      for (let i = ringCount; i >= 1; i--) {
        const ringDelay = i * 0.4;
        const pulse = Math.sin(t * 2 - ringDelay) * 0.5 + 0.5;
        const volumeScale = 1 + vol * 0.6 * i;
        const ringRadius = baseRadius + i * 14 * volumeScale + pulse * 4;
        const alpha = Math.max(0, 0.25 - i * 0.05) * (0.5 + vol * 0.5);

        ctx.beginPath();
        ctx.arc(center, center, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ring.replace(
          /[\d.]+\)$/,
          `${alpha})`
        );
        ctx.lineWidth = 1.5 + vol * 1.5;
        ctx.stroke();
      }

      // Draw glow
      const glowPulse = Math.sin(t * 3) * 0.5 + 0.5;
      const glowRadius = baseRadius + 20 + vol * 30 + glowPulse * 8;
      const glowGradient = ctx.createRadialGradient(
        center, center, baseRadius * 0.5,
        center, center, glowRadius
      );
      glowGradient.addColorStop(0, colors.glow.replace(/[\d.]+\)$/, `${0.3 + vol * 0.3})`));
      glowGradient.addColorStop(0.5, colors.glow.replace(/[\d.]+\)$/, `${0.1 + vol * 0.15})`));
      glowGradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Draw deformed core orb using sine waves for organic shape
      const coreRadius = baseRadius + vol * 8;
      const points = 64;

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 3 + t * 4) * vol * 5;
        const wave2 = Math.sin(angle * 5 - t * 3) * vol * 3;
        const wave3 = Math.sin(angle * 2 + t * 2) * 2; // subtle idle wave
        const r = coreRadius + wave1 + wave2 + wave3;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Core gradient
      const coreGradient = ctx.createRadialGradient(
        center - 10, center - 10, 0,
        center, center, coreRadius + 10
      );
      coreGradient.addColorStop(0, "rgba(255,255,255,0.15)");
      coreGradient.addColorStop(0.3, colors.core);
      coreGradient.addColorStop(1, colors.core.replace(/[\d.]+\)$/, "0.6)"));

      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Inner highlight
      const highlightGradient = ctx.createRadialGradient(
        center - 15, center - 15, 0,
        center, center, coreRadius * 0.6
      );
      highlightGradient.addColorStop(0, "rgba(255,255,255,0.25)");
      highlightGradient.addColorStop(1, "rgba(255,255,255,0)");

      ctx.beginPath();
      ctx.arc(center, center, coreRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [state, volume]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="h-[200px] w-[200px]"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}
