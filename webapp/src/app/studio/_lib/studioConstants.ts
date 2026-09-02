import { TrackRecord } from "@/lib/sqlWorker";

export const ALPHA_KEYS = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export const DEFAULT_PRESETS: TrackRecord[] = [
  { id: "preset_1", title: "Dreadlock Holiday", artist: "10cc", file_path: "clean_midi/10cc/Dreadlock Holiday.mid", duration: 309.95 },
  { id: "preset_2", title: "Bohemian Rhapsody", artist: "Queen", file_path: "clean_midi/Queen/Bohemian Rhapsody.mid", duration: 354.0 },
  { id: "preset_3", title: "Caught Up In You", artist: ".38 Special", file_path: "clean_midi/.38 Special/Caught Up In You.mid", duration: 276.0 },
  { id: "preset_4", title: "Dancing Queen", artist: "ABBA", file_path: "clean_midi/ABBA/Dancing Queen.mid", duration: 230.0 },
  { id: "preset_5", title: "A Campfire Song", artist: "10,000 Maniacs", file_path: "clean_midi/10,000 Maniacs/A Campfire Song.mid", duration: 205.0 },
];
