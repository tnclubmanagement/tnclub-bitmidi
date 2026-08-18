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
  enabledInstruments,
  setEnabledInstruments,
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

      // Helper: Classify MIDI Track Instrument Type Accurately (General MIDI Specs)
      const getInstrumentType = (channel: number, trackName: string = "", instrumentProgram: number = 0) => {
        if (channel === 9 || channel === 10) return "drums";
        const nameLower = trackName.toLowerCase();
        if (nameLower.includes("bass") || (instrumentProgram >= 32 && instrumentProgram <= 39)) return "bass";
        if (
          nameLower.includes("string") ||
          nameLower.includes("brass") ||
          nameLower.includes("pad") ||
          nameLower.includes("guitar") ||
          nameLower.includes("synth") ||
          nameLower.includes("organ") ||
          nameLower.includes("flute") ||
          nameLower.includes("sax") ||
          (instrumentProgram >= 24 && instrumentProgram <= 31) || // Guitars
          (instrumentProgram >= 40 && instrumentProgram <= 55) || // Strings/Ensemble
          (instrumentProgram >= 56 && instrumentProgram <= 79) || // Brass/Reed/Pipe
          (instrumentProgram >= 80 && instrumentProgram <= 103)  // Synth Lead/Pad
        ) {
          return "strings";
        }
        return "piano";
      };

      // Helper: Classify MIDI Track Instrument Color Palette
      const getTrackColor = (channel: number, trackName: string = "", program: number = 0, isHit: boolean = false) => {
        const type = getInstrumentType(channel, trackName, program);
        if (type === "drums") return { fill: isHit ? "#f59e0b" : "#d97706", stroke: "#fbbf24" };
        if (type === "bass") return { fill: isHit ? "#c084fc" : "#7e22ce", stroke: "#e9d5ff" };
        if (type === "strings") return { fill: isHit ? "#f472b6" : "#be185d", stroke: "#fbcfe8" };
        return { fill: isHit ? "#38bdf8" : "#0369a1", stroke: "#7dd3fc" };
      };

      // Render Falling Notes Blocks (Professional Synthesia 88-Key Grid Alignment)
      const speed = 120; // px/sec - smooth elegant speed
      const renderedNoteKeys = new Set<string>();
      const keyWidth = Math.max(8, width / 88); // Synthesia 88 piano keys width

      midiData.tracks.forEach((t) => {
        const programNumber = t.instrument?.number || 0;
        const type = getInstrumentType(t.channel || 0, t.name || "", programNumber);
        if (!enabledInstruments[type]) return; // Skip disabled instruments by user filter

        const isDrum = type === "drums";
        t.notes.forEach((n) => {
          // Quantize note time (50ms window) to merge micro-jitter duplicate notes into clean chords
          const timeQuantized = Math.round(n.time * 20) / 20;
          const noteKey = `${type}-${n.midi}-${timeQuantized}`;
          if (renderedNoteKeys.has(noteKey)) return;
          renderedNoteKeys.add(noteKey);

          // Calculate precise X aligned with 88-key piano keyboard layout
          const noteX = Math.min(width - keyWidth, Math.max(0, ((n.midi - 21) / 88) * width));
          const noteY = height - (n.time - currentTime) * speed - 20;
          
          // Cap max note height for sustained Pad/Strings notes so they don't stretch indefinitely
          const rawNoteHeight = n.duration * speed;
          const noteHeight = isDrum ? 8 : Math.min(180, Math.max(12, rawNoteHeight));

          if (noteY + noteHeight > 0 && noteY < height) {
            // Precise Hit Detection: Note head is at or crossing the baseline
            const timeDiff = currentTime - n.time;
            const isHit = timeDiff >= -0.05 && timeDiff <= Math.max(0.18, n.duration);
            const colors = getTrackColor(t.channel || 0, t.name || "", programNumber, isHit);

            const isStringsType = type === "strings";

            ctx.fillStyle = isStringsType
              ? isHit ? "rgba(244, 114, 182, 0.7)" : "rgba(244, 114, 182, 0.28)"
              : colors.fill;

            ctx.shadowBlur = isHit ? 10 : 0;
            ctx.shadowColor = colors.stroke;

            ctx.beginPath();
            ctx.roundRect(noteX, noteY, Math.max(6, keyWidth - 2), noteHeight, 4);
            ctx.fill();

            ctx.strokeStyle = isStringsType ? "rgba(244, 114, 182, 0.45)" : colors.stroke;
            ctx.lineWidth = isHit ? 1.5 : 0.8;
            ctx.stroke();
          }
        });
      });
      ctx.shadowBlur = 0;

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
      ctx.fillText(`Composer: ${track?.artist || "TN Web MIDI Studio"} — Interactive Staff Score (A4)`, width / 2, 70);

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

        // Render Notes Filtered by Enabled Instruments
        const filteredTracks = midiData.tracks.filter((t) => {
          const type = (t.channel === 9 || t.channel === 10) ? "drums" :
                       (t.name || "").toLowerCase().includes("bass") ? "bass" :
                       ((t.name || "").toLowerCase().includes("string") || (t.name || "").toLowerCase().includes("brass") || (t.name || "").toLowerCase().includes("guitar")) ? "strings" : "piano";
          return enabledInstruments[type] && t.notes.length > 0;
        });

        const rawNotes = filteredTracks.flatMap((t) => {
          const type = (t.channel === 9 || t.channel === 10) ? "drums" :
                       (t.name || "").toLowerCase().includes("bass") ? "bass" :
                       ((t.name || "").toLowerCase().includes("string") || (t.name || "").toLowerCase().includes("brass") || (t.name || "").toLowerCase().includes("guitar")) ? "strings" : "piano";
          return t.notes.map((n) => {
            (n as unknown as { _instType: string })._instType = type;
            return n;
          });
        });

        // Dynamic System Window tracking currentTime smoothly (4 seconds per system)
        const systemWindowSec = 4;
        const currentSystemPage = Math.floor(currentTime / (systemWindowSec * 2));
        const startSec = (currentSystemPage * 2 + systemIndex) * systemWindowSec;
        const systemNotes = rawNotes.filter((n) => n.time >= startSec && n.time < startSec + systemWindowSec);

        // Group notes played at the exact same timestamp into Chords
        const chordMap = new Map<number, typeof systemNotes>();
        systemNotes.forEach((n) => {
          const quantizedTime = Math.round(n.time * 10) / 10;
          if (!chordMap.has(quantizedTime)) {
            chordMap.set(quantizedTime, []);
          }
          chordMap.get(quantizedTime)!.push(n);
        });

        chordMap.forEach((chordNotes, timeKey) => {
          const noteX = 130 + ((timeKey - startSec) / systemWindowSec) * (staffWidth - 80);
          if (noteX <= 120 || noteX >= 70 + staffWidth) return;

          // Highlight playing notes in active system window
          const isActiveChord = isPlaying && Math.abs(currentTime - timeKey) < 0.2;

          // Render Treble & Bass notes within Chord
          const trebleNotes = chordNotes.filter((n) => n.midi >= 60);
          const bassNotes = chordNotes.filter((n) => n.midi < 60);

          const drawStaffChord = (cNotes: typeof systemNotes, isTrebleClef: boolean) => {
            if (cNotes.length === 0) return;

            const baseStaffY = isTrebleClef ? trebleY : bassY;
            const yPositions: number[] = [];

            cNotes.forEach((n) => {
              const semitoneOffset = isTrebleClef ? n.midi - 60 : n.midi - 48;
              const staffStepY = baseStaffY + 40 - semitoneOffset * 3.5;
              yPositions.push(staffStepY);

              // Match Notehead Color to Instrument Type (Piano: Cyan, Bass: Purple, Strings: Pink, Drums: Gold)
              const instType = (n as unknown as { _instType?: string })._instType || "piano";
              const noteColor =
                instType === "bass" ? "#7e22ce" :
                instType === "strings" ? "#be185d" :
                instType === "drums" ? "#d97706" : "#0284c7";

              // Draw Notehead Oval
              ctx.fillStyle = isActiveChord ? "#38bdf8" : noteColor;
              ctx.beginPath();
              ctx.ellipse(noteX, staffStepY, 5.5, 4, -0.2, 0, 2 * Math.PI);
              ctx.fill();

              // Ledger Lines
              if (staffStepY < baseStaffY) {
                for (let ly = baseStaffY - 10; ly >= staffStepY; ly -= 10) {
                  ctx.strokeStyle = "#94a3b8";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(noteX - 9, ly);
                  ctx.lineTo(noteX + 9, ly);
                  ctx.stroke();
                }
              } else if (staffStepY > baseStaffY + 40) {
                for (let ly = baseStaffY + 50; ly <= staffStepY; ly += 10) {
                  ctx.strokeStyle = "#94a3b8";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(noteX - 9, ly);
                  ctx.lineTo(noteX + 9, ly);
                  ctx.stroke();
                }
              }
            });

            // Single Stem for Chord
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
          };

          drawStaffChord(trebleNotes, true);
          drawStaffChord(bassNotes, false);
        });
      };

      // Render 2 Grand Staff Systems on A4 Sheet Page
      renderStaffPair(110, 0);
      renderStaffPair(310, 1);
    }
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
