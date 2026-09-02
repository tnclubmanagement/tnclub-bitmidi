"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { TrackRecord } from "@/lib/sqlWorker";
import { DEFAULT_STUDIO_SETTINGS, getStudioSettings, saveStudioSettings } from "../_lib/studioStorage";

interface UseTrackFiltersProps {
  tracks: TrackRecord[];
  playlist: TrackRecord[];
}

export function useTrackFilters({ tracks, playlist }: UseTrackFiltersProps) {
  const [selectedAlpha, setSelectedAlpha] = useState<string>(DEFAULT_STUDIO_SETTINGS.alpha);
  const [selectedGenre, setSelectedGenre] = useState<string>(DEFAULT_STUDIO_SETTINGS.genre);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(DEFAULT_STUDIO_SETTINGS.instrument);
  const [selectedCountry, setSelectedCountry] = useState<string>(DEFAULT_STUDIO_SETTINGS.country);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(DEFAULT_STUDIO_SETTINGS.favsOnly);
  const [sortBy] = useState<string>("artist_asc");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "compact" | "vinyl">(DEFAULT_STUDIO_SETTINGS.viewMode);
  const [enabledInstruments, setEnabledInstruments] = useState<Record<string, boolean>>(
    DEFAULT_STUDIO_SETTINGS.visualizerInstruments
  );

  useEffect(() => {
    const settings = getStudioSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAlpha(settings.alpha);
    setSelectedGenre(settings.genre);
    setSelectedInstrument(settings.instrument);
    setSelectedCountry(settings.country);
    setShowFavoritesOnly(settings.favsOnly);
    setViewMode(settings.viewMode);
    setEnabledInstruments(settings.visualizerInstruments);
  }, []);

  const handleGenreChange = useCallback((val: string) => {
    setSelectedGenre(val);
    saveStudioSettings({ genre: val });
  }, []);

  const handleInstrumentChange = useCallback((val: string) => {
    setSelectedInstrument(val);
    saveStudioSettings({ instrument: val });
  }, []);

  const handleCountryChange = useCallback((val: string) => {
    setSelectedCountry(val);
    saveStudioSettings({ country: val });
  }, []);

  const handleFavsOnlyToggle = useCallback(() => {
    setShowFavoritesOnly((prev) => {
      const next = !prev;
      saveStudioSettings({ favsOnly: next });
      return next;
    });
  }, []);

  const handleAlphaChange = useCallback((alpha: string) => {
    setSelectedAlpha(alpha);
    saveStudioSettings({ alpha });
  }, []);

  const handleViewModeChange = useCallback((mode: "table" | "grid" | "compact" | "vinyl") => {
    setViewMode(mode);
    saveStudioSettings({ viewMode: mode });
  }, []);

  const updateEnabledInstruments = useCallback(
    (updater: React.SetStateAction<Record<string, boolean>>) => {
      setEnabledInstruments((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveStudioSettings({ visualizerInstruments: next });
        return next;
      });
    },
    []
  );

  // Filter & Sort tracks in memory
  const processedTracks = useMemo(() => {
    let result = [...tracks];

    if (showFavoritesOnly) {
      const favIds = new Set(playlist.map((t) => t.id));
      result = result.filter((t) => favIds.has(t.id));
    }

    if (selectedGenre !== "ALL") {
      const gLower = selectedGenre.toLowerCase();
      result = result.filter((t) => {
        const fullStr = `${t.title} ${t.artist} ${t.file_path}`.toLowerCase();
        if (gLower === "pop") return fullStr.includes("pop") || fullStr.includes("dance") || fullStr.includes("hit");
        if (gLower === "rock") return fullStr.includes("rock") || fullStr.includes("metal") || fullStr.includes("band");
        if (gLower === "country") return fullStr.includes("country") || fullStr.includes("folk");
        if (gLower === "jazz") return fullStr.includes("jazz") || fullStr.includes("blues");
        if (gLower === "classical")
          return (
            fullStr.includes("classic") ||
            fullStr.includes("piano") ||
            fullStr.includes("sonata") ||
            fullStr.includes("symphony") ||
            fullStr.includes("bach") ||
            fullStr.includes("mozart") ||
            fullStr.includes("beethoven") ||
            fullStr.includes("chopin")
          );
        if (gLower === "electronic")
          return (
            fullStr.includes("synth") ||
            fullStr.includes("electro") ||
            fullStr.includes("techno") ||
            fullStr.includes("disco")
          );
        if (gLower === "soundtrack")
          return fullStr.includes("theme") || fullStr.includes("movie") || fullStr.includes("game") || fullStr.includes("ost");
        return fullStr.includes(gLower);
      });
    }

    if (selectedInstrument !== "ALL") {
      const instLower = selectedInstrument.toLowerCase();
      result = result.filter((t) => {
        if (instLower === "drums") return Boolean(t.has_drums);
        return (
          t.primary_instrument?.toLowerCase().includes(instLower) ||
          t.instruments?.toLowerCase().includes(`"${instLower}"`)
        );
      });
    }

    if (selectedAlpha !== "ALL") {
      result = result.filter((t) => t.artist.toUpperCase().startsWith(selectedAlpha));
    }

    if (selectedCountry !== "ALL") {
      result = result.filter((t) => {
        const fullText = `${t.artist} ${t.title} ${t.file_path}`.toLowerCase();
        const hasAsianChars =
          /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\uac00-\ud7af]/.test(
            `${t.artist} ${t.title}`
          );
        const isAsiaKeywords =
          fullText.includes("japan") ||
          fullText.includes("korea") ||
          fullText.includes("china") ||
          fullText.includes("vietnam") ||
          fullText.includes("anime") ||
          fullText.includes("jpop") ||
          fullText.includes("kpop");

        if (selectedCountry === "ASIA") {
          return hasAsianChars || isAsiaKeywords;
        }
        if (selectedCountry === "US_EU") {
          return !hasAsianChars && !isAsiaKeywords;
        }
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "artist_asc") return a.artist.localeCompare(b.artist);
      if (sortBy === "artist_desc") return b.artist.localeCompare(a.artist);
      if (sortBy === "title_asc") return a.title.localeCompare(b.title);
      if (sortBy === "title_desc") return b.title.localeCompare(a.title);
      return 0;
    });

    return result;
  }, [tracks, selectedGenre, selectedInstrument, selectedAlpha, selectedCountry, sortBy, showFavoritesOnly, playlist]);

  return {
    selectedAlpha,
    selectedGenre,
    selectedInstrument,
    selectedCountry,
    showFavoritesOnly,
    viewMode,
    enabledInstruments,
    processedTracks,
    handleGenreChange,
    handleInstrumentChange,
    handleCountryChange,
    handleFavsOnlyToggle,
    handleAlphaChange,
    handleViewModeChange,
    updateEnabledInstruments,
  };
}
