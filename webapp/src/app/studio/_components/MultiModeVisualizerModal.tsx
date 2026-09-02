"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Modal, Segmented, Button, Slider } from "antd";
import {
  PlayCircleFilled,
  PauseCircleFilled,
  DownloadOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { Midi } from "@tonejs/midi";
import { loadParsedMidi } from "@/lib/midiLoader";
import PianoRollVisualizer from "./PianoRollVisualizer";
import {
  MultiModeVisualizerModalProps,
  VisualizerMode,
  ProcessedFallingNote,
} from "./stage/types";
import { MidiDataProcessor } from "./stage/MidiDataProcessor";
import StageToolbar from "./stage/StageToolbar";
import StageCanvasVisualizer from "./stage/StageCanvasVisualizer";

export type { ProcessedFallingNote };

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
  onSeek,
  formatTime,
}: MultiModeVisualizerModalProps) {
  const [visMode, setVisMode] = useState<VisualizerMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tn_stage_vis_mode") as VisualizerMode;
        if (saved && ["falling-notes", "sheet", "piano-roll"].includes(saved)) return saved;
      } catch {}
    }
    return "falling-notes";
  });

  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("all");

  const [dedupSameInstrument, setDedupSameInstrument] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tn_stage_dedup_instrument");
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return true;
  });

  const handleVisModeChange = (val: VisualizerMode) => {
    setVisMode(val);
    try {
      localStorage.setItem("tn_stage_vis_mode", val);
    } catch (e) {
      console.warn("Failed to save stage visualizer mode to localStorage", e);
    }
  };

  const handleDedupChange = (val: boolean) => {
    setDedupSameInstrument(val);
    try {
      localStorage.setItem("tn_stage_dedup_instrument", String(val));
    } catch (e) {
      console.warn("Failed to save stage dedup setting to localStorage", e);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      togglePlay();
    } else if (track) {
      const soloIdx = selectedTrackId === "all" ? "all" : parseInt(selectedTrackId, 10);
      playTrack(track, currentTime, soloIdx);
    } else {
      togglePlay();
    }
  };

  const handleTrackChange = (val: string) => {
    setSelectedTrackId(val);
    if (isPlaying && track) {
      const soloIdx = val === "all" ? "all" : parseInt(val, 10);
      playTrack(track, currentTime, soloIdx);
    }
  };

  // Load and parse MIDI file structure for Visualizer rendering (Cached & Instant)
  useEffect(() => {
    if (!open || !track?.file_path) return;

    let isMounted = true;
    async function loadMidi() {
      try {
        const parsedMidi = await loadParsedMidi(track!.file_path);
        if (isMounted) {
          setMidiData(parsedMidi);
        }
      } catch (err) {
        console.warn("Failed to load MIDI for visualizer", err);
      }
    }

    loadMidi();
    return () => {
      isMounted = false;
    };
  }, [open, track]);

  // Pre-process and unify multi-track notes once when MIDI or filter/track changes
  const fallingNotes = useMemo(() => {
    if (!midiData) return [];
    return MidiDataProcessor.getProcessedFallingNotes(
      midiData,
      enabledInstruments,
      selectedTrackId,
      dedupSameInstrument
    );
  }, [midiData, enabledInstruments, selectedTrackId, dedupSameInstrument]);

  const rawSheetNotes = useMemo(() => {
    if (!midiData) return [];
    return MidiDataProcessor.getFilteredNotes(
      midiData,
      enabledInstruments,
      selectedTrackId,
      dedupSameInstrument
    );
  }, [midiData, enabledInstruments, selectedTrackId, dedupSameInstrument]);

  return (
    <Modal
      title={
        <div
          id="stage-modal-header"
          data-testid="stage-modal-header"
          aria-label="Stage Visualizer Header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CustomerServiceOutlined aria-hidden="true" style={{ color: "#38bdf8", fontSize: 22 }} />
            <span
              id="stage-modal-title"
              data-testid="stage-modal-title"
              aria-label={`Stage Visualizer: ${track?.title || "No Track Selected"}`}
              style={{ fontWeight: 700, fontSize: "1.1rem" }}
            >
              {track?.title || "No Track Selected"} — Stage Visualizer
            </span>
          </div>

          <Segmented
            id="stage-vis-mode-segmented"
            data-testid="stage-vis-mode-segmented"
            aria-label="Visualizer Mode Selector"
            options={[
              { value: "falling-notes", label: "🌊 Falling Notes (Synthesia)" },
              { value: "sheet", label: "🎼 Sheet Music A4" },
              { value: "piano-roll", label: "🎹 Piano Keyboard Roll" },
            ]}
            value={visMode}
            onChange={(val) => handleVisModeChange(val as VisualizerMode)}
          />
        </div>
      }
      open={open}
      onCancel={onClose}
      aria-label={`Stage Visualizer Dialog - ${track?.title || "No Track Selected"}`}
      data-testid="stage-visualizer-modal"
      width={940}
      footer={
        <div
          id="stage-modal-footer"
          data-testid="stage-modal-footer"
          aria-label="Stage Visualizer Playback Controls"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              id="stage-play-pause-btn"
              data-testid="stage-play-pause-btn"
              aria-label={isPlaying ? "Pause MIDI Playback" : "Play MIDI Playback"}
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              onClick={handleTogglePlay}
            />
            <span
              id="stage-time-display"
              data-testid="stage-time-display"
              aria-label={`Playback Time: ${formatTime(currentTime)} of ${formatTime(totalDuration)}`}
              style={{ fontSize: "0.85rem", color: "#94a3b8" }}
            >
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <Slider
            id="stage-progress-slider"
            data-testid="stage-progress-slider"
            aria-label="Stage Playback Progress Slider"
            style={{ flex: 1, margin: "0 24px" }}
            min={0}
            max={totalDuration || 100}
            value={currentTime}
            onChange={onSeek}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
          />

          {visMode === "sheet" && (
            <Button
              id="stage-export-btn"
              data-testid="stage-export-btn"
              aria-label="Print or Export Sheet Music"
              icon={<DownloadOutlined />}
              onClick={() => window.print()}
            >
              Print / Export Sheet
            </Button>
          )}
        </div>
      }
    >
      {/* Sub-header Unified Instrument & Track Toolbar */}
      <StageToolbar
        midiData={midiData}
        enabledInstruments={enabledInstruments}
        setEnabledInstruments={setEnabledInstruments}
        selectedTrackId={selectedTrackId}
        setSelectedTrackId={setSelectedTrackId}
        dedupSameInstrument={dedupSameInstrument}
        setDedupSameInstrument={handleDedupChange}
        onTrackChange={handleTrackChange}
      />

      {/* Main Visualizer Stage Area */}
      <div
        id="stage-vis-container"
        data-testid="stage-vis-container"
        aria-label="Visualizer Stage Container"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          background: "#090d16",
          marginTop: 16,
        }}
      >
        {visMode === "piano-roll" ? (
          <div
            id="stage-piano-roll-container"
            data-testid="stage-piano-roll-container"
            aria-label="Interactive Piano Keyboard Roll Container"
            style={{ padding: 24 }}
          >
            <PianoRollVisualizer activeNote={activeMidiNote} />
          </div>
        ) : (
          <StageCanvasVisualizer
            open={open}
            visMode={visMode}
            track={track}
            isPlaying={isPlaying}
            currentTime={currentTime}
            fallingNotes={fallingNotes}
            rawSheetNotes={rawSheetNotes}
          />
        )}
      </div>
    </Modal>
  );
}
