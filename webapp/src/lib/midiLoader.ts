import { Midi } from "@tonejs/midi";

const parsedMidiCache = new Map<string, Midi>();

export const getMidiUrl = (filePath: string): string => {
  const cleanPath = (filePath || "")
    .replace(/^.*clean_midi\//, "")
    .replace(/\\/g, "/")
    .replace(/"/g, "")
    .replace(/^\/+/, "");
  const encodedSegments = cleanPath.split("/").map((segment) => encodeURIComponent(segment));
  const midiBaseUrl =
    process.env.NEXT_PUBLIC_MIDI_BASE_URL ||
    "https://oczfmoquiugfdksddwuf.supabase.co/storage/v1/object/public/midi";
  return `${midiBaseUrl.replace(/\/$/, "")}/${encodedSegments.join("/")}`;
};

export async function loadParsedMidi(filePath: string): Promise<Midi> {
  const url = getMidiUrl(filePath);
  if (parsedMidiCache.has(url)) {
    return parsedMidiCache.get(url)!;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`MIDI file HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const parsed = new Midi(arrayBuffer);
    parsedMidiCache.set(url, parsed);
    return parsed;
  } catch (err) {
    console.warn("loadParsedMidi fallback for:", filePath, err);
    const fallbackMidi = new Midi();
    const trackObj = fallbackMidi.addTrack();
    const notesScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
    notesScale.forEach((noteNum, index) => {
      trackObj.addNote({
        midi: noteNum,
        time: index * 0.35,
        duration: 0.3,
        velocity: 0.8,
      });
    });
    parsedMidiCache.set(url, fallbackMidi);
    return fallbackMidi;
  }
}
