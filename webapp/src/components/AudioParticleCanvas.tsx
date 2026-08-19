"use client";

import React, { useEffect, useRef } from "react";

interface AudioParticleCanvasProps {
  themeMode?: "dark" | "light" | "neon" | "retro";
}

export const AudioParticleCanvas: React.FC<AudioParticleCanvasProps> = ({
  themeMode = "dark",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 450;
    };

    window.addEventListener("resize", handleResize);

    // Color palettes based on themeMode
    const getColors = () => {
      switch (themeMode) {
        case "neon":
          return {
            particleColors: ["#06b6d4", "#ec4899", "#a855f7", "#3b82f6"],
            waveColor1: "rgba(6, 182, 212, 0.4)",
            waveColor2: "rgba(236, 72, 153, 0.3)",
          };
        case "retro":
          return {
            particleColors: ["#f59e0b", "#d97706", "#ef4444", "#fbbf24"],
            waveColor1: "rgba(245, 158, 11, 0.4)",
            waveColor2: "rgba(239, 68, 68, 0.3)",
          };
        case "light":
          return {
            particleColors: ["#0284c7", "#0d9488", "#6366f1", "#38bdf8"],
            waveColor1: "rgba(2, 132, 199, 0.25)",
            waveColor2: "rgba(99, 102, 241, 0.2)",
          };
        case "dark":
        default:
          return {
            particleColors: ["#38bdf8", "#818cf8", "#c084fc", "#34d399"],
            waveColor1: "rgba(56, 189, 248, 0.35)",
            waveColor2: "rgba(192, 132, 252, 0.25)",
          };
      }
    };

    // Particles setup
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      colorIndex: Math.floor(Math.random() * 4),
    }));

    // Mouse position tracking for interactive effect
    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const palette = getColors();

      phase += 0.025;

      // 1. Draw Audio Waveform Lines at Bottom
      const drawWave = (color: string, amplitude: number, frequency: number, phaseOffset: number) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let x = 0; x < width; x += 6) {
          const y =
            height / 2 +
            Math.sin(x * frequency + phase + phaseOffset) * amplitude +
            Math.cos(x * 0.005 + phase * 0.5) * (amplitude * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawWave(palette.waveColor1, 28, 0.008, 0);
      drawWave(palette.waveColor2, 18, 0.012, Math.PI / 2);

      // 2. Draw Interactive Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce on edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Pulse alpha
        p.alpha += Math.sin(phase * 2) * p.pulseSpeed * 0.2;
        const clampedAlpha = Math.max(0.1, Math.min(0.85, p.alpha));

        // Mouse attraction / gentle push
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = palette.particleColors[p.colorIndex];
        ctx.globalAlpha = clampedAlpha;
        ctx.shadowColor = palette.particleColors[p.colorIndex];
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [themeMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 1,
        opacity: 0.7,
      }}
    />
  );
};
