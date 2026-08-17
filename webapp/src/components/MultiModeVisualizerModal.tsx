"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, Segmented, Button, Slider } from "antd";
import {
  PlayCircleFilled,
  PauseCircleFilled,
  DownloadOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { Midi } from "@tonejs/midi";
import { TrackRecord } from "@/lib/sqlWorker";
import PianoRollVisualizer from "@/components/PianoRollVisualizer";

type Props = {
  open: boolean;
  onClose: () => void;
  track: TrackRecord | null;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  activeMidiNote: number | null;
  togglePlay: () => void;
  playTrack: (track: TrackRecord) => void;
  getMidiUrl: (filePath: string) => string;
  formatTime: (sec: number) => string;
};

export default function MultiModeVisualizerModal({
  open,
  onClose,
  track,
  isPlaying,
  currentTime,
  totalDuration,
  activeMidiNote,
  togglePlay,
  playTrack,
  getMidiUrl,
  formatTime,
}: Props) {
  const [visMode, setVisMode] = useState<"falling-notes" | "sheet" | "piano-roll">("falling-notes");
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleTogglePlay = () => {
    if (isPlaying) {
      togglePlay();
    } else if (track) {
      playTrack(track);
    } else {
      togglePlay();
    }
  };

  // Load and parse MIDI file structure for Visualizer rendering
  useEffect(() => {
    if (!open || !track) return;

    let isMounted = true;
    async function loadMidiData() {
      try {
        const res = await fetch(getMidiUrl(track!.file_path));
        if (!res.ok) throw new Error("MIDI 404");
        const buffer = await res.arrayBuffer();
        const parsedMidi = new Midi(buffer);
        if (isMounted) setMidiData(parsedMidi);
      } catch (e) {
        console.warn("Using Dynamic Sequence Fallback for Synced Stage Visualizer", e);
        const parsedMidi = new Midi();
        const trk = parsedMidi.addTrack();
        const notesScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
        notesScale.forEach((n, idx) => {
          trk.addNote({ midi: n, time: idx * 0.4, duration: 0.35, velocity: 0.85 });
        });
        if (isMounted) setMidiData(parsedMidi);
      }
    }

    loadMidiData();
    return () => {
      isMounted = false;
    };
  }, [open, track, getMidiUrl]);

  // Render Canvas 2D per mode (With High DPI Retina Scaling)
  useEffect(() => {
    if (!open || !canvasRef.current || !midiData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const displayWidth = canvas.parentElement?.clientWidth || 880;
    const displayHeight = visMode === "sheet" ? 540 : 380;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.textBaseline = "middle";

    const width = displayWidth;
    const height = displayHeight;

    ctx.clearRect(0, 0, width, height);

    if (visMode === "falling-notes") {
      // 1. Render Falling Notes (Synthesia Style synced with Player)
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      // Background Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Render Falling Notes Blocks (Classical Slate Tone)
      const speed = 140; // px/sec
      const notes = midiData.tracks.flatMap((t) => t.notes);

      notes.forEach((n) => {
        const noteX = ((n.midi - 21) / 88) * width;
        const noteY = height - (n.time - currentTime) * speed - 20;
        const noteHeight = Math.max(12, n.duration * speed);

        if (noteY + noteHeight > 0 && noteY < height) {
          const isHit = Math.abs(n.time - currentTime) < 0.15;
          ctx.fillStyle = isHit ? "#6366f1" : "#475569";
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.roundRect(noteX, noteY, 14, noteHeight, 4);
          ctx.fill();

          ctx.strokeStyle = isHit ? "#818cf8" : "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Subtle Baseline
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, height - 20);
      ctx.lineTo(width, height - 20);
      ctx.stroke();

    } else if (visMode === "sheet") {
      // 2. Render High-Resolution Classical Sheet Music A4 Format (Grand Staff)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Title & Header (Classical Serif Typeface)
      ctx.fillStyle = "#0f172a";
      ctx.font = 'bold 22px "Playfair Display", "Georgia", "Times New Roman", serif';
      ctx.textAlign = "center";
      ctx.fillText(track?.title || "Piano Sheet Music", width / 2, 45);

      ctx.font = 'italic 13px "Georgia", serif';
      ctx.fillStyle = "#64748b";
      ctx.fillText(`Composer: ${track?.artist || "TN Web MIDI Studio"} — Piano Grand Staff (A4)`, width / 2, 70);

      // Decorative divider lines
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 85);
      ctx.lineTo(width - 60, 85);
      ctx.stroke();

      // Grand Staff Systems (Treble + Bass)
      const renderStaffPair = (startY: number, systemIndex: number) => {
        const trebleY = startY;
        const bassY = startY + 80;
        const staffWidth = width - 140;

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.2;

        // Treble 5 Lines
        for (let i = 0; i < 5; i++) {
          const y = trebleY + i * 10;
          ctx.beginPath();
          ctx.moveTo(70, y);
          ctx.lineTo(70 + staffWidth, y);
          ctx.stroke();
        }

        // Bass 5 Lines
        for (let i = 0; i < 5; i++) {
          const y = bassY + i * 10;
          ctx.beginPath();
          ctx.moveTo(70, y);
          ctx.lineTo(70 + staffWidth, y);
          ctx.stroke();
        }

        // Connecting Bar Line on left
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(70, trebleY);
        ctx.lineTo(70, bassY + 40);
        ctx.stroke();

        // Bar lines (Measure Dividers)
        const measWidth = staffWidth / 4;
        ctx.lineWidth = 1.2;
        for (let m = 1; m <= 4; m++) {
          const bx = 70 + m * measWidth;
          ctx.beginPath();
          ctx.moveTo(bx, trebleY);
          ctx.lineTo(bx, trebleY + 40);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bx, bassY);
          ctx.lineTo(bx, bassY + 40);
          ctx.stroke();
        }

        // Clef Labels
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 26px serif";
        ctx.textAlign = "center";
        ctx.fillText("𝄞", 88, trebleY + 20); // Treble Clef G
        ctx.fillText("𝄢", 88, bassY + 20);   // Bass Clef F

        // Time Signature 4/4
        ctx.font = "bold 16px serif";
        ctx.fillText("4", 112, trebleY + 10);
        ctx.fillText("4", 112, trebleY + 30);
        ctx.fillText("4", 112, bassY + 10);
        ctx.fillText("4", 112, bassY + 30);

        // Render Notes in this System
        const notes = midiData.tracks.flatMap((t) => t.notes);
        const startSec = systemIndex * 8;
        const systemNotes = notes.filter((n) => n.time >= startSec && n.time < startSec + 8);

        systemNotes.forEach((n) => {
          const isTreble = n.midi >= 60;
          const noteX = 130 + ((n.time - startSec) / 8) * (staffWidth - 70);
          const baseStaffY = isTreble ? trebleY : bassY;
          const noteY = isTreble ? baseStaffY + 40 - ((n.midi - 60) * 3) : baseStaffY + 40 - ((n.midi - 43) * 3);

          if (noteX > 120 && noteX < 70 + staffWidth) {
            // Note Head (Filled Oval)
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.ellipse(noteX, noteY, 5.5, 4, -0.2, 0, 2 * Math.PI);
            ctx.fill();

            // Note Stem
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = "#0f172a";
            ctx.beginPath();
            ctx.moveTo(noteX + 5, noteY);
            ctx.lineTo(noteX + 5, noteY - 22);
            ctx.stroke();
          }
        });
      };

      // Render 2 Grand Staff Systems on A4 Sheet Page
      renderStaffPair(110, 0);
      renderStaffPair(310, 1);
    }
  }, [visMode, currentTime, midiData, open, track]);

  return (
    <Modal
      title={
        <div id="stage-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CustomerServiceOutlined style={{ color: "#38bdf8", fontSize: 22 }} />
            <span id="stage-modal-title" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{track?.title || "No Track Selected"} — Stage Visualizer</span>
          </div>

          <Segmented
            id="stage-vis-mode-segmented"
            options={[
              { value: "falling-notes", label: "🌊 Falling Notes (Synthesia)" },
              { value: "sheet", label: "🎼 Sheet Music A4" },
              { value: "piano-roll", label: "🎹 Piano Keyboard Roll" },
            ]}
            value={visMode}
            onChange={(val) => setVisMode(val as "falling-notes" | "sheet" | "piano-roll")}
          />
        </div>
      }
      open={open}
      onCancel={onClose}
      width={940}
      footer={
        <div id="stage-modal-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              id="stage-play-pause-btn"
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              onClick={handleTogglePlay}
            />
            <span id="stage-time-display" style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <Slider
            id="stage-progress-slider"
            style={{ flex: 1, margin: "0 24px" }}
            min={0}
            max={totalDuration || 100}
            value={currentTime}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
          />

          <Button id="stage-export-btn" icon={<DownloadOutlined />} onClick={() => window.print()}>
            Print / Export Sheet
          </Button>
        </div>
      }
    >
      <div id="stage-vis-container" style={{ borderRadius: 12, overflow: "hidden", background: "#090d16", marginTop: 16 }}>
        {visMode === "piano-roll" ? (
          <div id="stage-piano-roll-container" style={{ padding: 24 }}>
            <PianoRollVisualizer activeNote={activeMidiNote} />
          </div>
        ) : (
          <div id="stage-canvas-container" style={{ width: "100%", height: visMode === "sheet" ? 540 : 380, position: "relative" }}>
            <canvas id="stage-visualizer-canvas" ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
