import { TrackRecord } from "@/lib/sqlWorker";

export interface StudioSettings {
  alpha: string;
  genre: string;
  instrument: string;
  country: string;
  favsOnly: boolean;
  viewMode: "table" | "grid" | "compact" | "vinyl";
  visualizerInstruments: Record<string, boolean>;
  volume: number;
  isMuted: boolean;
  loopMode: "off" | "one";
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  alpha: "ALL",
  genre: "ALL",
  instrument: "ALL",
  country: "ALL",
  favsOnly: false,
  viewMode: "table",
  visualizerInstruments: {
    piano: true,
    bass: true,
    strings: true,
    drums: true,
  },
  volume: 80,
  isMuted: false,
  loopMode: "off",
};

const STORAGE_KEYS = {
  SETTINGS: "tn_studio_settings",
  PLAYLIST: "tn_studio_playlist",
  LEGACY_PLAYLIST: "tn_midi_playlist",
} as const;

/**
 * Load grouped Studio settings from localStorage with fallback to defaults and legacy keys migration
 */
export function getStudioSettings(): StudioSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STUDIO_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STUDIO_SETTINGS,
        ...parsed,
        visualizerInstruments: {
          ...DEFAULT_STUDIO_SETTINGS.visualizerInstruments,
          ...(parsed.visualizerInstruments || {}),
        },
      };
    }

    // Check & migrate legacy individual localStorage keys
    const legacySettings: Partial<StudioSettings> = {};
    const legacyAlpha = localStorage.getItem("tn_filter_alpha");
    if (legacyAlpha) legacySettings.alpha = legacyAlpha;

    const legacyGenre = localStorage.getItem("tn_filter_genre");
    if (legacyGenre) legacySettings.genre = legacyGenre;

    const legacyInstrument = localStorage.getItem("tn_filter_instrument");
    if (legacyInstrument) legacySettings.instrument = legacyInstrument;

    const legacyCountry = localStorage.getItem("tn_filter_country");
    if (legacyCountry) legacySettings.country = legacyCountry;

    const legacyFavsOnly = localStorage.getItem("tn_filter_favs_only");
    if (legacyFavsOnly !== null) legacySettings.favsOnly = legacyFavsOnly === "true";

    const legacyViewMode = localStorage.getItem("tn_filter_view_mode");
    if (legacyViewMode && ["table", "grid", "compact", "vinyl"].includes(legacyViewMode)) {
      legacySettings.viewMode = legacyViewMode as StudioSettings["viewMode"];
    }

    const legacyVisInsts = localStorage.getItem("tn_filter_visualizer_instruments");
    if (legacyVisInsts) {
      try {
        legacySettings.visualizerInstruments = JSON.parse(legacyVisInsts);
      } catch {}
    }

    const legacyVolume = localStorage.getItem("tn_player_volume");
    if (legacyVolume !== null) legacySettings.volume = Number(legacyVolume);

    const legacyMuted = localStorage.getItem("tn_player_muted");
    if (legacyMuted !== null) legacySettings.isMuted = legacyMuted === "true";

    const legacyLoopMode = localStorage.getItem("tn_player_loop_mode");
    if (legacyLoopMode && ["off", "one"].includes(legacyLoopMode)) {
      legacySettings.loopMode = legacyLoopMode as StudioSettings["loopMode"];
    }

    const merged = { ...DEFAULT_STUDIO_SETTINGS, ...legacySettings };
    // Persist as grouped settings
    saveStudioSettings(merged);
    return merged;
  } catch (e) {
    console.warn("Failed to load studio settings from localStorage", e);
    return { ...DEFAULT_STUDIO_SETTINGS };
  }
}

/**
 * Update and persist partial Studio settings into grouped localStorage
 */
export function saveStudioSettings(updates: Partial<StudioSettings>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getStudioSettings();
    const next: StudioSettings = {
      ...current,
      ...updates,
      visualizerInstruments: updates.visualizerInstruments
        ? { ...current.visualizerInstruments, ...updates.visualizerInstruments }
        : current.visualizerInstruments,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
  } catch (e) {
    console.warn("Failed to save studio settings to localStorage", e);
  }
}

/**
 * Load playlist from localStorage (with fallback to default and legacy key support)
 */
export function getStudioPlaylist(fallback: TrackRecord[]): TrackRecord[] {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYLIST) || localStorage.getItem(STORAGE_KEYS.LEGACY_PLAYLIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load playlist from localStorage", e);
  }
  return fallback;
}

/**
 * Save playlist into grouped localStorage key
 */
export function saveStudioPlaylist(playlist: TrackRecord[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLIST, JSON.stringify(playlist));
  } catch (e) {
    console.warn("Failed to save playlist to localStorage", e);
  }
}
