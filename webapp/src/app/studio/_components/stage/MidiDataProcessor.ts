import { Midi } from "@tonejs/midi";
import { ProcessedFallingNote, INSTRUMENT_PALETTE, getInstrumentCategory } from "./types";

export class MidiDataProcessor {
  static getProcessedFallingNotes(
    midiData: Midi,
    enabledInstruments: Record<string, boolean>,
    selectedTrackId: string = "all",
    dedupSameInstrument: boolean = true
  ): ProcessedFallingNote[] {
    const list: ProcessedFallingNote[] = [];

    let targetTracks = midiData.tracks.filter((t) => t.notes.length > 0);

    // If a specific individual track is selected in the dropdown:
    if (selectedTrackId !== "all") {
      const trackIdx = parseInt(selectedTrackId, 10);
      if (!isNaN(trackIdx) && midiData.tracks[trackIdx]) {
        targetTracks = [midiData.tracks[trackIdx]];
      }
    } else if (dedupSameInstrument) {
      // Deduplicate: Pick the richest track per instrument to prevent redundant multi-track pile-ups
      const catTrackMap = new Map<string, typeof targetTracks[0]>();
      targetTracks.forEach((t) => {
        const programNumber = t.instrument?.number || 0;
        const cat = getInstrumentCategory(t.channel || 0, t.name || "", programNumber);
        if (!catTrackMap.has(cat) || t.notes.length > catTrackMap.get(cat)!.notes.length) {
          catTrackMap.set(cat, t);
        }
      });
      targetTracks = Array.from(catTrackMap.values());
    }

    targetTracks.forEach((t) => {
      const programNumber = t.instrument?.number || 0;
      const cat = getInstrumentCategory(t.channel || 0, t.name || "", programNumber);
      if (selectedTrackId === "all" && !enabledInstruments[cat]) return;

      const palette = INSTRUMENT_PALETTE[cat] || INSTRUMENT_PALETTE.piano;
      const isDrum = cat === "drums";

      t.notes.forEach((n) => {
        if (n.midi < 21 || n.midi > 108) return;
        list.push({
          time: n.time,
          duration: n.duration,
          midi: n.midi,
          cat,
          normalFill: palette.normalFill,
          hitFill: palette.hitFill,
          stroke: palette.stroke,
          isDrum,
        });
      });
    });

    // Pre-sort once chronologically by start time for O(log N) binary search
    list.sort((a, b) => a.time - b.time);
    return list;
  }

  static findFirstVisibleIndex(notes: ProcessedFallingNote[], minTime: number): number {
    let low = 0;
    let high = notes.length - 1;
    let ans = notes.length;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (notes[mid].time >= minTime) {
        ans = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return ans;
  }

  static getFilteredNotes(
    midiData: Midi,
    enabledInstruments: Record<string, boolean>,
    selectedTrackId: string = "all",
    dedupSameInstrument: boolean = true
  ) {
    let targetTracks = midiData.tracks.filter((t) => t.notes.length > 0);
    if (selectedTrackId !== "all") {
      const trackIdx = parseInt(selectedTrackId, 10);
      if (!isNaN(trackIdx) && midiData.tracks[trackIdx]) {
        targetTracks = [midiData.tracks[trackIdx]];
      }
    } else if (dedupSameInstrument) {
      const catTrackMap = new Map<string, typeof targetTracks[0]>();
      targetTracks.forEach((t) => {
        const programNumber = t.instrument?.number || 0;
        const cat = getInstrumentCategory(t.channel || 0, t.name || "", programNumber);
        if (!catTrackMap.has(cat) || t.notes.length > catTrackMap.get(cat)!.notes.length) {
          catTrackMap.set(cat, t);
        }
      });
      targetTracks = Array.from(catTrackMap.values());
    }

    const filteredTracks = targetTracks.filter((t) => {
      const cat = getInstrumentCategory(t.channel || 0, t.name || "", t.instrument?.number || 0);
      return (selectedTrackId !== "all" || enabledInstruments[cat]) && t.notes.length > 0;
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
