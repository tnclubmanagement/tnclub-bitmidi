"use client";

import React, { useMemo } from "react";
import { Tag, Select, Switch, Tooltip } from "antd";
import { Midi } from "@tonejs/midi";
import { getInstrumentCategory } from "./types";

interface StageToolbarProps {
  midiData: Midi | null;
  enabledInstruments: Record<string, boolean>;
  setEnabledInstruments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedTrackId: string;
  setSelectedTrackId: (id: string) => void;
  dedupSameInstrument: boolean;
  setDedupSameInstrument: (val: boolean) => void;
  onTrackChange: (val: string) => void;
}

const INSTRUMENT_BUTTONS = [
  { key: "piano", label: "🎹 Piano/Lead", activeColor: "#0284c7" },
  { key: "bass", label: "🎸 Bassline", activeColor: "#7e22ce" },
  { key: "strings", label: "🎻 Strings/Pad", activeColor: "#be185d" },
  { key: "drums", label: "🥁 Drums", activeColor: "#d97706" },
];

export default function StageToolbar({
  midiData,
  enabledInstruments,
  setEnabledInstruments,
  selectedTrackId,
  setSelectedTrackId,
  dedupSameInstrument,
  setDedupSameInstrument,
  onTrackChange,
}: StageToolbarProps) {
  // Pre-calculate track counts and note counts per instrument category
  const instrumentStats = useMemo(() => {
    const stats: Record<string, { trackCount: number; noteCount: number }> = {
      piano: { trackCount: 0, noteCount: 0 },
      bass: { trackCount: 0, noteCount: 0 },
      strings: { trackCount: 0, noteCount: 0 },
      drums: { trackCount: 0, noteCount: 0 },
    };
    if (!midiData) return stats;
    midiData.tracks.forEach((t) => {
      const programNumber = t.instrument?.number || 0;
      const cat = getInstrumentCategory(t.channel || 0, t.name || "", programNumber);
      if (stats[cat] && t.notes.length > 0) {
        stats[cat].trackCount += 1;
        stats[cat].noteCount += t.notes.length;
      }
    });
    return stats;
  }, [midiData]);

  return (
    <div
      id="stage-instrument-filter-bar"
      data-testid="stage-instrument-filter-bar"
      aria-label="Instrument & Track Filter Toolbar"
      role="toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "rgba(15, 23, 42, 0.75)",
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        marginTop: 12,
        gap: 12,
      }}
    >
      {/* Left Section: Glowing Instrument Pills */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {INSTRUMENT_BUTTONS.map((inst) => {
          const isActive = enabledInstruments[inst.key];
          const stats = instrumentStats[inst.key];
          const hasNotes = stats && stats.noteCount > 0;

          return (
            <Tag
              key={inst.key}
              id={`stage-filter-tag-${inst.key}`}
              data-testid={`stage-filter-${inst.key}`}
              role="button"
              aria-pressed={isActive}
              aria-label={`Toggle ${inst.label} track filter, currently ${isActive ? "active" : "muted"}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (selectedTrackId !== "all") setSelectedTrackId("all");
                  setEnabledInstruments((prev) => ({
                    ...prev,
                    [inst.key]: !prev[inst.key],
                  }));
                }
              }}
              style={{
                cursor: "pointer",
                padding: "4px 12px",
                borderRadius: 16,
                userSelect: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isActive ? inst.activeColor : "rgba(30, 41, 59, 0.4)",
                color: isActive ? "#ffffff" : "#64748b",
                border: `1px solid ${isActive ? inst.activeColor : "rgba(255, 255, 255, 0.08)"}`,
                boxShadow: isActive ? `0 0 12px ${inst.activeColor}45` : "none",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                margin: 0,
                opacity: hasNotes ? 1 : 0.45,
              }}
              onClick={() => {
                if (selectedTrackId !== "all") setSelectedTrackId("all");
                setEnabledInstruments((prev) => ({
                  ...prev,
                  [inst.key]: !prev[inst.key],
                }));
              }}
            >
              <span>{inst.label}</span>
              {hasNotes && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "1px 5px",
                    borderRadius: 8,
                    background: isActive ? "rgba(0, 0, 0, 0.28)" : "rgba(255, 255, 255, 0.06)",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontWeight: 700,
                  }}
                >
                  {stats.noteCount > 999
                    ? `${(stats.noteCount / 1000).toFixed(1)}k`
                    : stats.noteCount}
                </span>
              )}
            </Tag>
          );
        })}
      </div>

      {/* Right Section: Compact Track Selector & Anti-stutter switch */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 1, height: 20, background: "rgba(255, 255, 255, 0.12)" }} />

        <Select
          id="stage-track-select"
          data-testid="stage-track-select"
          aria-label="Chọn Track hoặc Tất cả Track để hiển thị"
          value={selectedTrackId}
          onChange={onTrackChange}
          style={{ width: 220 }}
          size="small"
          popupMatchSelectWidth={false}
          options={[
            { value: "all", label: "🎵 Tất cả Tracks (Tổng hợp)" },
            ...(midiData?.tracks || [])
              .map((trk, idx) => ({
                value: `${idx}`,
                trk,
                idx,
              }))
              .filter(({ trk }) => trk.notes.length > 0)
              .map(({ trk, idx }) => {
                const cat = getInstrumentCategory(trk.channel || 0, trk.name || "", trk.instrument?.number || 0);
                const name = trk.name || trk.instrument?.name || `Track #${idx + 1}`;
                return {
                  value: `${idx}`,
                  label: `#${idx + 1}: ${name} (${cat.toUpperCase()} • ${trk.notes.length} notes)`,
                };
              }),
          ]}
        />

        {selectedTrackId === "all" && (
          <Tooltip title="Chỉ chọn 1 track đại diện nhiều note nhất cho mỗi loại nhạc cụ, tránh chồng lặp nhiều track gây giật cục">
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Switch
                id="stage-dedup-switch"
                data-testid="stage-dedup-switch"
                aria-label="Không cho chồng lặp cùng 1 loại nhạc cụ"
                size="small"
                checked={dedupSameInstrument}
                onChange={setDedupSameInstrument}
              />
              <span style={{ fontSize: "0.76rem", color: dedupSameInstrument ? "#38bdf8" : "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                Chống giật
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
