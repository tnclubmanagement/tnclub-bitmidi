import { TrackRecord } from "@/lib/sqlWorker";

export interface ProcessedFallingNote {
  time: number;
  duration: number;
  midi: number;
  cat: string;
  normalFill: string;
  hitFill: string;
  stroke: string;
  isDrum: boolean;
}

export type VisualizerMode = "falling-notes" | "sheet" | "piano-roll";

export interface MultiModeVisualizerModalProps {
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
  playTrack: (track: TrackRecord, startFromTime?: number, soloTrackIndex?: number | "all") => void;
  getMidiUrl: (filePath: string) => string;
  onSeek?: (newTime: number) => void;
  formatTime: (sec: number) => string;
}

export const INSTRUMENT_PALETTE: Record<
  string,
  { normalFill: string; hitFill: string; stroke: string; noteColor: string }
> = {
  drums: { normalFill: "#d97706", hitFill: "#f59e0b", stroke: "#fbbf24", noteColor: "#d97706" },
  bass: { normalFill: "#7e22ce", hitFill: "#c084fc", stroke: "#e9d5ff", noteColor: "#7e22ce" },
  strings: { normalFill: "rgba(244, 114, 182, 0.4)", hitFill: "rgba(244, 114, 182, 0.9)", stroke: "#f472b6", noteColor: "#be185d" },
  piano: { normalFill: "#0369a1", hitFill: "#38bdf8", stroke: "#7dd3fc", noteColor: "#0284c7" },
};

export function getInstrumentCategory(channel: number, name: string = "", program: number = 0): string {
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
