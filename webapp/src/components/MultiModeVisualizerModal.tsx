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
import { Soundfont } from "smplr";
import { TrackRecord } from "@/lib/sqlWorker";
import PianoRollVisualizer from "@/components/PianoRollVisualizer";

type Props = {
  open: boolean;
  onClose: () => void;
  track: TrackRecord | null;
  getMidiUrl: (filePath: string) => string;
};

export default function MultiModeVisualizerModal({ open, onClose, track, getMidiUrl }: Props) {
  const [visMode, setVisMode] = useState<"falling-notes" | "sheet" | "piano-roll">("falling-notes");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);
  const [midiData, setMidiData] = useState<Midi | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundfontRef = useRef<Soundfont | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTimeoutsRef = useRef<number[]>([]);
  const playbackTimerRef = useRef<number | null>(null);

  const clearNotes = () => {
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current = [];
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setActiveMidiNote(null);
    setCurrentTime(0);
    if (soundfontRef.current) {
      soundfontRef.current.stop();
    }
  };

  const initSoundfont = async () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    if (!soundfontRef.current && audioCtxRef.current) {
      soundfontRef.current = new Soundfont(audioCtxRef.current, {
        instrument: "acoustic_grand_piano",
      });
      await soundfontRef.current.load;
    }
  };

  const startPlayback = (midi: Midi) => {
    clearNotes();
    setIsPlaying(true);

    playbackTimerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        return next <= midi.duration ? next : midi.duration;
      });
    }, 100);

    midi.tracks.forEach((t) => {
      t.notes.forEach((note) => {
        const delayMs = note.time * 1000;
        const tid = window.setTimeout(() => {
          if (soundfontRef.current) {
            setActiveMidiNote(note.midi);
            soundfontRef.current.start({
              note: note.midi,
              velocity: Math.floor(note.velocity * 127),
              duration: note.duration,
            });
          }
        }, delayMs);
        activeTimeoutsRef.current.push(tid);
      });
    });

    const endId = window.setTimeout(() => {
      setIsPlaying(false);
      setActiveMidiNote(null);
    }, midi.duration * 1000);
    activeTimeoutsRef.current.push(endId);
  };

  useEffect(() => {
    if (!open || !track) {
      return;
    }

    async function loadMidi() {
      try {
        await initSoundfont();
        let parsedMidi: Midi;
        try {
          const res = await fetch(getMidiUrl(track!.file_path));
          if (!res.ok) throw new Error("MIDI 404");
          const buffer = await res.arrayBuffer();
          parsedMidi = new Midi(buffer);
        } catch (e) {
          console.warn("Using Dynamic Sequence Fallback for Stage Modal", e);
          parsedMidi = new Midi();
          const trk = parsedMidi.addTrack();
          const notesScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
          notesScale.forEach((n, idx) => {
            trk.addNote({ midi: n, time: idx * 0.4, duration: 0.35, velocity: 0.85 });
          });
        }

        setMidiData(parsedMidi);
        setTotalDuration(parsedMidi.duration);
        startPlayback(parsedMidi);
      } catch (err) {
        console.error("Modal playback init error", err);
      }
    }

    loadMidi();

    return () => {
      clearNotes();
    };
  }, [open, track]);

  const togglePlay = () => {
    if (isPlaying) {
      clearNotes();
      setIsPlaying(false);
    } else if (midiData) {
      startPlayback(midiData);
    }
  };

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
      // 1. Render Falling Notes (Synthesia Style)
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

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CustomerServiceOutlined style={{ color: "#38bdf8", fontSize: 22 }} />
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{track?.title} — Stage Visualizer</span>
          </div>

          <Segmented
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
      onCancel={() => {
        clearNotes();
        onClose();
      }}
      width={940}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              onClick={togglePlay}
            />
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <Slider
            style={{ flex: 1, margin: "0 24px" }}
            min={0}
            max={totalDuration || 100}
            value={currentTime}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
          />

          <Button icon={<DownloadOutlined />} onClick={() => window.print()}>
            Print / Export Sheet
          </Button>
        </div>
      }
    >
      <div style={{ borderRadius: 12, overflow: "hidden", background: "#090d16", marginTop: 16 }}>
        {visMode === "piano-roll" ? (
          <div style={{ padding: 24 }}>
            <PianoRollVisualizer activeNote={activeMidiNote} />
          </div>
        ) : (
          <div style={{ width: "100%", height: visMode === "sheet" ? 540 : 380, position: "relative" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
