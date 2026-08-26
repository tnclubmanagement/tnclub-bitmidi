"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, Segmented, Button, Slider, Tag } from "antd";
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
  enabledInstruments: Record<string, boolean>;
  setEnabledInstruments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  togglePlay: () => void;
  playTrack: (track: TrackRecord) => void;
  getMidiUrl: (filePath: string) => string;
  onSeek?: (newTime: number) => void;
  formatTime: (sec: number) => string;
};

// Top-Level Clean Lookup & Helper Functions
const INSTRUMENT_PALETTE: Record<
  string,
  { normalFill: string; hitFill: string; stroke: string; noteColor: string }
> = {
  drums: { normalFill: "#d97706", hitFill: "#f59e0b", stroke: "#fbbf24", noteColor: "#d97706" },
  bass: { normalFill: "#7e22ce", hitFill: "#c084fc", stroke: "#e9d5ff", noteColor: "#7e22ce" },
  strings: { normalFill: "rgba(244, 114, 182, 0.28)", hitFill: "rgba(244, 114, 182, 0.7)", stroke: "rgba(244, 114, 182, 0.45)", noteColor: "#be185d" },
  piano: { normalFill: "#0369a1", hitFill: "#38bdf8", stroke: "#7dd3fc", noteColor: "#0284c7" },
};

function getInstrumentCategory(channel: number, name: string = "", program: number = 0): string {
  if (channel === 9 || channel === 10) return "drums";
  const nameLower = name.toLowerCase();
  if (nameLower.includes("bass") || (program >= 32 && program <= 39)) return "bass";
  if (
    nameLower.includes("string") ||
    nameLower.includes("brass") ||
    nameLower.includes("pad") ||
    nameLower.includes("guitar") ||
    nameLower.includes("synth") ||
    nameLower.includes("organ") ||
    nameLower.includes("flute") ||
    nameLower.includes("sax") ||
    (program >= 24 && program <= 31) ||
    (program >= 40 && program <= 55) ||
    (program >= 56 && program <= 79) ||
    (program >= 80 && program <= 103)
  ) {
    return "strings";
  }
  return "piano";
}

function drawLedgerLines(ctx: CanvasRenderingContext2D, noteX: number, startY: number, endY: number, step: number) {
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  const isUp = endY < startY;
  for (let ly = startY + (isUp ? -step : step); isUp ? ly >= endY : ly <= endY; ly += isUp ? -step : step) {
    ctx.beginPath();
    ctx.moveTo(noteX - 9, ly);
    ctx.lineTo(noteX + 9, ly);
    ctx.stroke();
  }
}

// Data Mapper & Pipeline Processor Object for Sheet Music & Canvas
class MidiDataProcessor {
  static getFilteredNotes(midiData: Midi, enabledInstruments: Record<string, boolean>) {
    const filteredTracks = midiData.tracks.filter((t) => {
      const cat = getInstrumentCategory(t.channel || 0, t.name || "", t.instrument?.number || 0);
      return enabledInstruments[cat] && t.notes.length > 0;
    });

    return filteredTracks.flatMap((t) => {
      const cat = getInstrumentCategory(t.channel || 0, t.name || "", t.instrument?.number || 0);
      return t.notes.map((n) => {
        (n as unknown as { _instType: string })._instType = cat;
        return n;
      });
    });
  }

  static getSystemChords(
    rawNotes: Array<{ time: number; midi: number; _instType?: string }>,
    currentTime: number,
    systemIndex: number,
    systemWindowSec: number = 4
  ) {
    const currentSystemPage = Math.floor(currentTime / (systemWindowSec * 2));
    const startSec = (currentSystemPage * 2 + systemIndex) * systemWindowSec;
    const systemNotes = rawNotes.filter((n) => n.time >= startSec && n.time < startSec + systemWindowSec);

    const chordMap = new Map<number, typeof systemNotes>();
    systemNotes.forEach((n) => {
      const quantizedTime = Math.round(n.time * 10) / 10;
      if (!chordMap.has(quantizedTime)) {
        chordMap.set(quantizedTime, []);
      }
      chordMap.get(quantizedTime)!.push(n);
    });

    return { chordMap, startSec, systemWindowSec };
  }
}

// Dedicated Canvas Painter Object (Encapsulates repetitive 2D drawing calls)
class CanvasPainter {
  static drawSheetHeader(ctx: CanvasRenderingContext2D, width: number, title: string, artist: string) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, 540);

    ctx.fillStyle = "#0f172a";
    ctx.font = 'bold 22px "Playfair Display", "Georgia", "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(title || "Piano Sheet Music", width / 2, 45);

    ctx.font = 'italic 13px "Georgia", serif';
    ctx.fillStyle = "#64748b";
    ctx.fillText(`Composer: ${artist || "TN Web MIDI Studio"} — Interactive Staff Score (A4)`, width / 2, 70);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 85);
    ctx.lineTo(width - 60, 85);
    ctx.stroke();
  }

  static drawGrandStaffSystem(
    ctx: CanvasRenderingContext2D,
    startY: number,
    systemIndex: number,
    width: number,
    rawNotes: Array<{ time: number; midi: number; _instType?: string }>,
    currentTime: number,
    isPlaying: boolean
  ) {
    const trebleY = startY;
    const bassY = startY + 80;
    const staffWidth = width - 140;

    // Draw Staff Grid Lines & Measure Dividers
    drawStaffGrid(ctx, trebleY, bassY, staffWidth);

    // Draw Clef & Time Signatures
    drawClefsAndTimeSignature(ctx, trebleY, bassY);

    // Get System Window Chords via Data Processor Class
    const { chordMap, startSec, systemWindowSec } = MidiDataProcessor.getSystemChords(rawNotes, currentTime, systemIndex);

    // Draw Treble & Bass Clef Chords
    chordMap.forEach((chordNotes, timeKey) => {
      const noteX = 130 + ((timeKey - startSec) / systemWindowSec) * (staffWidth - 80);
      if (noteX <= 120 || noteX >= 70 + staffWidth) return;

      const isActiveChord = isPlaying && Math.abs(currentTime - timeKey) < 0.2;
      const trebleNotes = chordNotes.filter((n) => n.midi >= 60);
      const bassNotes = chordNotes.filter((n) => n.midi < 60);

      drawStaffChordNotes(ctx, trebleNotes, trebleY, noteX, true, isActiveChord);
      drawStaffChordNotes(ctx, bassNotes, bassY, noteX, false, isActiveChord);
    });
  }

  static drawFallingNotesBackground(ctx: CanvasRenderingContext2D, width: number, height: number, hitY: number) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#080d1a");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle lane dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const keyWidth = width / 88;
    for (let i = 0; i < 88; i++) {
      const x = i * keyWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hitY);
      ctx.stroke();
    }

    // Glowing Neon Hit Line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(width, hitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bottom Piano Keyboard Bar background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, hitY, width, height - hitY);
  }

  static drawKeyboard(ctx: CanvasRenderingContext2D, width: number, height: number, hitY: number, activeKeys: Map<number, string>) {
    const keyWidth = width / 88;
    const kbHeight = height - hitY;

    for (let midi = 21; midi <= 108; midi++) {
      const idx = midi - 21;
      const x = idx * keyWidth;
      const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
      const activeColor = activeKeys.get(midi);

      if (activeColor) {
        ctx.fillStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, hitY + 2, keyWidth - 1, kbHeight - 4);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = isBlack ? "#1e293b" : "#334155";
        ctx.fillRect(x, hitY + 2, keyWidth - 1, isBlack ? kbHeight * 0.65 : kbHeight - 4);
      }
    }
  }
}

// Render Helper Functions (Decomposed Small Single-Responsibility Functions)
function drawStaffGrid(ctx: CanvasRenderingContext2D, trebleY: number, bassY: number, staffWidth: number) {
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(70, trebleY + i * 10);
    ctx.lineTo(70 + staffWidth, trebleY + i * 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(70, bassY + i * 10);
    ctx.lineTo(70 + staffWidth, bassY + i * 10);
    ctx.stroke();
  }

  // Left Bracket Bar Line
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(70, trebleY);
  ctx.lineTo(70, bassY + 40);
  ctx.stroke();

  // Measure Dividers (4 measures)
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
}

function drawClefsAndTimeSignature(ctx: CanvasRenderingContext2D, trebleY: number, bassY: number) {
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 26px serif";
  ctx.textAlign = "center";
  ctx.fillText("𝄞", 88, trebleY + 20);
  ctx.fillText("𝄢", 88, bassY + 20);

  ctx.font = "bold 16px serif";
  ctx.fillText("4", 112, trebleY + 10);
  ctx.fillText("4", 112, trebleY + 30);
  ctx.fillText("4", 112, bassY + 10);
  ctx.fillText("4", 112, bassY + 30);
}

function drawStaffChordNotes(
  ctx: CanvasRenderingContext2D,
  chordNotes: Array<{ midi: number; _instType?: string }>,
  baseStaffY: number,
  noteX: number,
  isTrebleClef: boolean,
  isActiveChord: boolean
) {
  if (chordNotes.length === 0) return;

  const yPositions: number[] = [];
  chordNotes.forEach((n) => {
    const semitoneOffset = isTrebleClef ? n.midi - 60 : n.midi - 48;
    const staffStepY = baseStaffY + 40 - semitoneOffset * 3.5;
    yPositions.push(staffStepY);

    const palette = INSTRUMENT_PALETTE[n._instType || "piano"] || INSTRUMENT_PALETTE.piano;

    ctx.fillStyle = isActiveChord ? "#38bdf8" : palette.noteColor;
    ctx.beginPath();
    ctx.ellipse(noteX, staffStepY, 5.5, 4, -0.2, 0, 2 * Math.PI);
    ctx.fill();

    if (staffStepY < baseStaffY) {
      drawLedgerLines(ctx, noteX, baseStaffY - 10, staffStepY, 10);
    } else if (staffStepY > baseStaffY + 40) {
      drawLedgerLines(ctx, noteX, baseStaffY + 50, staffStepY, 10);
    }
  });

  if (yPositions.length > 0) {
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    ctx.strokeStyle = isActiveChord ? "#0284c7" : "#0f172a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(noteX + 5, maxY);
    ctx.lineTo(noteX + 5, minY - 20);
    ctx.stroke();
  }
}

export default function MultiModeVisualizerModal({
  open,
  onClose,
  track,
  isPlaying,
  currentTime,
  totalDuration,
  activeMidiNote,
  enabledInstruments,
  setEnabledInstruments,
  togglePlay,
  playTrack,
  getMidiUrl,
  onSeek,
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

  // Render Canvas 2D per mode (With High DPI Retina Scaling & Cached Resolution)
  useEffect(() => {
    if (!open || !canvasRef.current || !midiData) return;
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

    // Render Strategy Dispatcher (Replaces if-else branching with Strategy Pattern)
    const renderStrategies: Record<
      string,
      (ctx: CanvasRenderingContext2D, width: number, height: number) => void
    > = {
      "falling-notes": (ctx, width, height) => {
        const hitY = height - 42;
        CanvasPainter.drawFallingNotesBackground(ctx, width, height, hitY);

        const speed = 140; // px per second
        const keyWidth = width / 88;
        const activeKeys = new Map<number, string>();

        midiData.tracks.forEach((t) => {
          const programNumber = t.instrument?.number || 0;
          const cat = getInstrumentCategory(t.channel || 0, t.name || "", programNumber);
          if (!enabledInstruments[cat]) return;

          const palette = INSTRUMENT_PALETTE[cat] || INSTRUMENT_PALETTE.piano;
          const isDrum = cat === "drums";

          t.notes.forEach((n) => {
            if (n.midi < 21 || n.midi > 108) return;
            const noteX = ((n.midi - 21) / 88) * width;
            const headY = hitY - (n.time - currentTime) * speed;
            const noteHeight = isDrum ? 10 : Math.min(220, Math.max(14, n.duration * speed));
            const topY = headY - noteHeight;

            // Only draw notes currently visible on the falling stage
            if (topY < height && headY > 0) {
              const isHit = currentTime >= n.time - 0.05 && currentTime <= n.time + n.duration + 0.05;
              if (isHit) {
                activeKeys.set(n.midi, palette.hitFill);
              }

              ctx.fillStyle = isHit ? palette.hitFill : palette.normalFill;
              ctx.shadowColor = palette.stroke;
              ctx.shadowBlur = isHit ? 14 : 2;

              ctx.beginPath();
              ctx.roundRect(noteX + 1, topY, Math.max(4, keyWidth - 2), noteHeight, 4);
              ctx.fill();

              ctx.strokeStyle = palette.stroke;
              ctx.lineWidth = isHit ? 1.5 : 0.8;
              ctx.stroke();
            }
          });
        });
        ctx.shadowBlur = 0;

        // Draw interactive bottom keyboard with active key illumination
        CanvasPainter.drawKeyboard(ctx, width, height, hitY, activeKeys);
      },

      sheet: (ctx, width) => {
        CanvasPainter.drawSheetHeader(ctx, width, track?.title || "", track?.artist || "");
        const rawNotes = MidiDataProcessor.getFilteredNotes(midiData, enabledInstruments);

        // Declarative Grand Staff Systems Map Array (2 Systems per A4 Page)
        [110, 310].forEach((startY, systemIdx) => {
          CanvasPainter.drawGrandStaffSystem(ctx, startY, systemIdx, width, rawNotes, currentTime, isPlaying);
        });
      },
    };

    // Dispatch Strategy
    const renderFn = renderStrategies[visMode];
    if (renderFn) {
      renderFn(ctx, width, height);
    }
    ctx.restore();
  }, [visMode, currentTime, isPlaying, midiData, open, track, enabledInstruments]);

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
            onChange={onSeek}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
          />

          <Button id="stage-export-btn" icon={<DownloadOutlined />} onClick={() => window.print()}>
            Print / Export Sheet
          </Button>
        </div>
      }
    >
      {/* Row 2: Sub-header Instrument Filter Controls Bar */}
      <div
        id="stage-instrument-filter-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(15, 23, 42, 0.6)",
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginTop: 12,
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8" }}>
          🎛️ Bật/Tắt Lọc Nhạc Cụ:
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[
            { key: "piano", label: "🎹 Piano/Lead", activeColor: "#0284c7" },
            { key: "bass", label: "🎸 Bassline", activeColor: "#7e22ce" },
            { key: "strings", label: "🎻 Strings/Pad", activeColor: "#be185d" },
            { key: "drums", label: "🥁 Drums", activeColor: "#d97706" },
          ].map((inst) => {
            const isActive = enabledInstruments[inst.key];
            return (
              <Tag
                key={inst.key}
                style={{
                  cursor: "pointer",
                  padding: "4px 14px",
                  borderRadius: 14,
                  userSelect: "none",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: isActive ? inst.activeColor : "rgba(30, 41, 59, 0.5)",
                  color: isActive ? "#ffffff" : "#64748b",
                  border: `1px solid ${isActive ? inst.activeColor : "rgba(255, 255, 255, 0.1)"}`,
                  boxShadow: isActive ? `0 0 10px ${inst.activeColor}40` : "none",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onClick={() =>
                  setEnabledInstruments((prev) => ({
                    ...prev,
                    [inst.key]: !prev[inst.key],
                  }))
                }
              >
                {inst.label}
              </Tag>
            );
          })}
        </div>
      </div>
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
