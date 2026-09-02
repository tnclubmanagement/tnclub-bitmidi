"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { TrackRecord } from "@/lib/sqlWorker";
import { ProcessedFallingNote, VisualizerMode } from "./types";
import { CanvasPainter } from "./CanvasPainter";

interface StageCanvasVisualizerProps {
  open: boolean;
  visMode: VisualizerMode;
  track: TrackRecord | null;
  isPlaying: boolean;
  currentTime: number;
  fallingNotes: ProcessedFallingNote[];
  rawSheetNotes: Array<{ time: number; midi: number; _instType?: string }>;
}

export default function StageCanvasVisualizer({
  open,
  visMode,
  track,
  isPlaying,
  currentTime,
  fallingNotes,
  rawSheetNotes,
}: StageCanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Decoupled continuous time tracking for 60fps/120fps stutter-free RAF rendering
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const lastSyncTsRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    lastSyncTsRef.current = performance.now();
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    lastSyncTsRef.current = performance.now();
  }, [isPlaying]);

  const renderCanvasFrame = useCallback(
    (timeToRender: number) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 2;
      const displayWidth = canvas.parentElement?.clientWidth || 880;
      const displayHeight = visMode === "sheet" ? 540 : 380;

      // Only resize canvas buffer if dimensions actually change (prevents expensive Canvas clear & layout thrashing)
      const targetWidth = displayWidth * dpr;
      const targetHeight = displayHeight * dpr;
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.textBaseline = "middle";

      const width = displayWidth;
      const height = displayHeight;

      ctx.clearRect(0, 0, width, height);

      if (visMode === "falling-notes") {
        CanvasPainter.drawFallingNotes(ctx, width, height, fallingNotes, timeToRender);
      } else if (visMode === "sheet") {
        CanvasPainter.drawSheetHeader(ctx, width, track?.title || "", track?.artist || "");
        [110, 310].forEach((startY, systemIdx) => {
          CanvasPainter.drawGrandStaffSystem(ctx, startY, systemIdx, width, rawSheetNotes, timeToRender, isPlayingRef.current);
        });
      }

      ctx.restore();
    },
    [visMode, fallingNotes, rawSheetNotes, track]
  );

  // Smooth Hardware VSync Animation Loop
  useEffect(() => {
    if (!open) return;

    if (visMode === "piano-roll") {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    lastSyncTsRef.current = performance.now();
    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      let effectiveTime = currentTimeRef.current;
      if (isPlayingRef.current) {
        const elapsed = (performance.now() - lastSyncTsRef.current) / 1000;
        effectiveTime = currentTimeRef.current + elapsed;
      }
      renderCanvasFrame(effectiveTime);

      if (isPlayingRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      rafIdRef.current = requestAnimationFrame(animate);
    } else {
      renderCanvasFrame(currentTimeRef.current);
    }

    return () => {
      isRunning = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [open, isPlaying, visMode, renderCanvasFrame]);

  return (
    <div
      id="stage-canvas-container"
      data-testid="stage-canvas-container"
      aria-label={`${visMode === "sheet" ? "Sheet Music" : "Falling Notes Synthesia"} Canvas Container`}
      style={{ width: "100%", height: visMode === "sheet" ? 540 : 380, position: "relative" }}
    >
      <canvas
        id="stage-visualizer-canvas"
        data-testid="stage-visualizer-canvas"
        aria-label={`Real-time Stage Visualizer Render Canvas (${visMode})`}
        role="img"
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
