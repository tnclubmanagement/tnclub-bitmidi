"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Input, Spin, Badge, Button, Select, ConfigProvider, theme, Segmented, Drawer, Popover, message } from "antd";
import {
  SearchOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
  BarsOutlined,
  HeartOutlined,
  HeartFilled,
  UnorderedListOutlined,
  DeleteOutlined,
  CompassOutlined,
  MenuOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { MasterIndexEntry, TrackRecord, createShardWorker, fetchTracksFromShard } from "@/lib/sqlWorker";
import type { WorkerHttpvfs } from "sql.js-httpvfs";
import { Midi } from "@tonejs/midi";
import { Soundfont } from "smplr";
import MultiModeVisualizerModal from "@/components/MultiModeVisualizerModal";
import FooterPlayer from "@/components/FooterPlayer";
import TrackListView from "@/components/TrackListView";
import { AppSettingsProvider, useAppSettings, ThemeMode, Language } from "@/context/AppSettingsContext";
import styles from "../app.module.css";

const ALPHA_KEYS = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

function MainStudioContent() {
  const { themeMode, setThemeMode, language, setLanguage, t } = useAppSettings();

  const [, setMasterIndex] = useState<MasterIndexEntry[]>([]);
  const [selectedShard, setSelectedShard] = useState<string>("");
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAlpha, setSelectedAlpha] = useState<string>("ALL");
  const [sortBy] = useState<string>("artist_asc");
  const [viewMode, setViewMode] = useState<"table" | "grid" | "compact" | "vinyl">("table");
  const [loading, setLoading] = useState<boolean>(true);
  const [enabledInstruments, setEnabledInstruments] = useState<Record<string, boolean>>({
    piano: true,
    bass: true,
    strings: true,
    drums: true,
  });

  // Dynamic Theme Algorithm Selector & Custom Token Palette
  const getAntdTheme = () => {
    if (themeMode === "light") {
      return {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0284c7",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f8fafc",
          colorText: "#0f172a",
        },
      };
    }
    if (themeMode === "neon") {
      return {
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#06b6d4",
          colorBgContainer: "#050b14",
          colorBgLayout: "#020617",
          colorText: "#38bdf8",
        },
      };
    }
    if (themeMode === "retro") {
      return {
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#d97706",
          colorBgContainer: "#1c1917",
          colorBgLayout: "#0c0a09",
          colorText: "#fef3c7",
        },
      };
    }
    // Default Dark Mode
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#0284c7",
        colorBgContainer: "#0f172a",
        colorBgLayout: "#090d16",
        colorText: "#f8fafc",
      },
    };
  };

  // Preset Curated Playlists (Spotify / Apple Music Style)
  const DEFAULT_PRESETS: TrackRecord[] = useMemo(() => [
    { id: "preset_1", title: "Amish Paradise", artist: "\"Weird Al\" Yankovic", file_path: "clean_midi/Yankovic, \"Weird Al\"/Amish Paradise.mid" },
    { id: "preset_2", title: "A Night To Remember", artist: "911", file_path: "clean_midi/911/A Night To Remember.mid" },
    { id: "preset_3", title: "Don't Look Back In Anger", artist: "Oasis", file_path: "clean_midi/Oasis/Don't Look Back In Anger.mid" },
    { id: "preset_4", title: "Bohemian Rhapsody", artist: "Queen", file_path: "clean_midi/Queen/Bohemian Rhapsody.mid" },
    { id: "preset_5", title: "Canon in D", artist: "Johann Pachelbel", file_path: "clean_midi/Pachelbel/Canon in D.mid" },
  ], []);

  // Playlist & Favorites State (SSR Hydration Safe)
  const [playlist, setPlaylist] = useState<TrackRecord[]>(DEFAULT_PRESETS);

  // Sync localStorage on Client Mount (SSR Hydration Safe)
  useEffect(() => {
    try {
      const savedPlaylist = localStorage.getItem("tn_midi_playlist");
      if (savedPlaylist) {
        const parsed = JSON.parse(savedPlaylist);
        if (Array.isArray(parsed) && parsed.length > 0) {
          requestAnimationFrame(() => {
            setPlaylist(parsed);
          });
        }
      }
    } catch (e) {
      console.warn("Failed to load playlist from localStorage", e);
    }
  }, []);

  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);

  // Multi-Mode Stage Visualizer Modal State
  const [stageTrack, setStageTrack] = useState<TrackRecord | null>(null);
  const [isStageOpen, setIsStageOpen] = useState<boolean>(false);

  // Player States
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [, setAudioStatus] = useState<string>("Ready");
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);

  // Advanced Player States (Seek, Volume, Loop)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [loopMode, setLoopMode] = useState<"off" | "one">("off");

  // Worker & Caching Refs
  const workerRef = useRef<WorkerHttpvfs | null>(null);
  const shardCacheRef = useRef<Map<string, TrackRecord[]>>(new Map());
  const soundfontRef = useRef<Soundfont | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTimeoutsRef = useRef<number[]>([]);
  const playbackTimerRef = useRef<number | null>(null);

  // Lưu Playlist vào LocalStorage
  const savePlaylistToStorage = (newPlaylist: TrackRecord[]) => {
    setPlaylist(newPlaylist);
    try {
      localStorage.setItem("tn_midi_playlist", JSON.stringify(newPlaylist));
    } catch (e) {
      console.warn("Failed to save playlist to localStorage", e);
    }
  };

  const togglePlaylistTrack = (e: React.MouseEvent, track: TrackRecord) => {
    e.stopPropagation();
    const exists = playlist.some((t) => t.id === track.id);
    let updated: TrackRecord[];
    if (exists) {
      updated = playlist.filter((t) => t.id !== track.id);
      message.info(`Removed "${track.title}" from Playlist`);
    } else {
      updated = [...playlist, track];
      message.success(`Added "${track.title}" to Playlist`);
    }
    savePlaylistToStorage(updated);
  };

  const removeFromPlaylist = (trackId: string) => {
    const updated = playlist.filter((t) => t.id !== trackId);
    savePlaylistToStorage(updated);
  };

  // Fetch Master Index on initial load
  useEffect(() => {
    async function loadIndex() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/db/master_index.json`);
        const data: MasterIndexEntry[] = await res.json();
        setMasterIndex(data);
        if (data.length > 0) {
          setSelectedShard(data[0].shard as string);
        }
      } catch (err) {
        console.error("Failed to load master_index.json", err);
      }
    }
    loadIndex();
  }, []);



  // Mount/Switch Web Worker with Shard Caching
  useEffect(() => {
    if (!selectedShard) return;

    let isMounted = true;

    async function initWorker() {
      setLoading(true);

      // Check Cache first
      if (shardCacheRef.current.has(selectedShard) && searchQuery.trim() === "") {
        setTracks(shardCacheRef.current.get(selectedShard)!);
        setLoading(false);
        return;
      }

      if (workerRef.current) {
        try {
          const comlinkWorker = workerRef.current.worker as unknown as { releaseProxy?: () => void };
          if (typeof comlinkWorker.releaseProxy === "function") {
            comlinkWorker.releaseProxy();
          }
        } catch (e) {
          console.warn("Cleanup previous worker error", e);
        }
        workerRef.current = null;
      }

      try {
        const worker = await createShardWorker(selectedShard);
        if (!isMounted) return;

        workerRef.current = worker;
        const result = await fetchTracksFromShard(worker, searchQuery);
        if (isMounted) {
          if (searchQuery.trim() === "") {
            shardCacheRef.current.set(selectedShard, result);
          }
          setTracks(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing shard worker", err);
        if (isMounted) setLoading(false);
      }
    }

    initWorker();

    return () => {
      isMounted = false;
    };
  }, [selectedShard, searchQuery]);

  const handleSearch = async (value: string) => {
    setSearchQuery(value);
    if (workerRef.current) {
      setLoading(true);
      try {
        const result = await fetchTracksFromShard(workerRef.current, value);
        setTracks(result);
      } finally {
        setLoading(false);
      }
    }
  };

  const getMidiUrl = (filePath: string) => {
    let relPath = "";
    const match = filePath.match(/clean_midi\/(.+)$/);
    if (match) {
      relPath = match[1];
    } else {
      relPath = filePath.split("/").pop() || "";
    }
    const encodedSegments = relPath.split("/").map((segment) => encodeURIComponent(segment));
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    return `${basePath}/midi/${encodedSegments.join("/")}`;
  };

  const downloadMidiFile = (e: React.MouseEvent, track: TrackRecord) => {
    e.stopPropagation();
    const url = getMidiUrl(track.file_path);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${track.artist} - ${track.title}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pausePlayback = () => {
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current = [];
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setActiveMidiNote(null);
    if (soundfontRef.current) {
      soundfontRef.current.stop();
    }
  };

  const clearActiveNotes = () => {
    pausePlayback();
    setCurrentTime(0);
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
      setAudioStatus("Loading Piano SoundFont...");
      soundfontRef.current = new Soundfont(audioCtxRef.current, {
        instrument: "acoustic_grand_piano",
      });
      await soundfontRef.current.load;
      setAudioStatus("SoundFont Ready");
    }
  };

  const playTrack = async (track: TrackRecord) => {
    setCurrentTrack(track);
    clearActiveNotes();

    try {
      setAudioStatus("Loading SoundFont & MIDI...");
      await initSoundfont();

      let midi: Midi;
      try {
        const midiUrl = getMidiUrl(track.file_path);
        const res = await fetch(midiUrl);
        if (!res.ok) {
          throw new Error(`MIDI file not found (${res.status})`);
        }
        const arrayBuffer = await res.arrayBuffer();
        midi = new Midi(arrayBuffer);
      } catch (err) {
        console.warn("MIDI file fetch error, using dynamic Synthesizer Sequence", err);
        midi = new Midi();
        const trackObj = midi.addTrack();
        const notesScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
        notesScale.forEach((noteNum, index) => {
          trackObj.addNote({
            midi: noteNum,
            time: index * 0.35,
            duration: 0.3,
            velocity: 0.8,
          });
        });
      }

      setTotalDuration(midi.duration);
      setAudioStatus("Playing MIDI Audio...");
      setIsPlaying(true);

      // High-Precision Time Sync Engine (AudioContext Precise Clock)
      const audioCtx = audioCtxRef.current;
      const audioStartCtxTime = audioCtx ? audioCtx.currentTime - currentTime : 0;
      const initialCurrentTime = currentTime;
      let fallbackTs = 0;

      playbackTimerRef.current = window.setInterval(() => {
        let elapsedSec = 0;
        if (audioCtx) {
          elapsedSec = audioCtx.currentTime - audioStartCtxTime;
        } else {
          if (!fallbackTs) fallbackTs = Date.now() - initialCurrentTime * 1000;
          elapsedSec = (Date.now() - fallbackTs) / 1000;
        }

        if (elapsedSec <= midi.duration) {
          setCurrentTime(elapsedSec);
        } else {
          setCurrentTime(midi.duration);
        }
      }, 16);

      // Helper: Classify Instrument Type
      const getInstType = (channel: number, name: string = "", program: number = 0) => {
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
      };

      // Schedule notes with Volume & Instrument Filter Control
      const targetVolume = isMuted ? 0 : volume / 100;

      midi.tracks.forEach((t) => {
        const programNumber = t.instrument?.number || 0;
        const instType = getInstType(t.channel || 0, t.name || "", programNumber);

        t.notes.forEach((note) => {
          const delayMs = (note.time - currentTime) * 1000;
          if (delayMs < 0) return; // Skip notes in the past

          const timeoutId = window.setTimeout(() => {
            // Check real-time instrument mute state right when the note triggers
            if (soundfontRef.current && enabledInstrumentsRef.current[instType]) {
              setActiveMidiNote(note.midi);
              soundfontRef.current.start({
                note: note.midi,
                velocity: Math.floor(note.velocity * 127 * targetVolume),
                duration: note.duration,
              });
            }
          }, delayMs);
          activeTimeoutsRef.current.push(timeoutId);
        });
      });

      const totalDurationMs = (midi.duration - currentTime) * 1000;
      const endTimeoutId = window.setTimeout(() => {
        if (loopMode === "one") {
          playTrack(track);
        } else {
          // Auto play next track in playlist if playing from playlist
          const playlistIndex = playlist.findIndex((t) => t.id === track.id);
          if (playlistIndex !== -1 && playlistIndex < playlist.length - 1) {
            playTrack(playlist[playlistIndex + 1]);
          } else {
            setIsPlaying(false);
            setActiveMidiNote(null);
            setAudioStatus("Finished");
          }
        }
      }, totalDurationMs);
      activeTimeoutsRef.current.push(endTimeoutId);

    } catch (err) {
      console.error("Playback error", err);
      setAudioStatus(`Error: ${(err as Error).message}`);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
      setIsPlaying(false);
      setAudioStatus("Paused");
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
  };

  // Keep enabledInstruments in a Ref to avoid re-triggering component re-renders
  const enabledInstrumentsRef = useRef(enabledInstruments);
  useEffect(() => {
    enabledInstrumentsRef.current = enabledInstruments;
  }, [enabledInstruments]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (currentTrack) {
          togglePlay();
        } else if (tracks.length > 0) {
          playTrack(tracks[0]);
        }
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
        message.info(isMuted ? "Audio Unmuted" : "Audio Muted");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTrack, isPlaying, isMuted, tracks, playTrack, togglePlay]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

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
        if (gLower === "classical") return fullStr.includes("classic") || fullStr.includes("piano") || fullStr.includes("sonata") || fullStr.includes("symphony") || fullStr.includes("bach") || fullStr.includes("mozart") || fullStr.includes("beethoven") || fullStr.includes("chopin");
        if (gLower === "electronic") return fullStr.includes("synth") || fullStr.includes("electro") || fullStr.includes("techno") || fullStr.includes("disco");
        if (gLower === "soundtrack") return fullStr.includes("theme") || fullStr.includes("movie") || fullStr.includes("game") || fullStr.includes("ost");
        return fullStr.includes(gLower);
      });
    }

    if (selectedAlpha !== "ALL") {
      result = result.filter((t) =>
        t.artist.toUpperCase().startsWith(selectedAlpha)
      );
    }

    if (selectedCountry !== "ALL") {
      result = result.filter((t) => {
        const fullText = `${t.artist} ${t.title} ${t.file_path}`.toLowerCase();
        const hasAsianChars = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\uac00-\ud7af]/.test(`${t.artist} ${t.title}`);
        const isAsiaKeywords = fullText.includes("japan") || fullText.includes("korea") || fullText.includes("china") || fullText.includes("vietnam") || fullText.includes("anime") || fullText.includes("jpop") || fullText.includes("kpop");

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
  }, [tracks, selectedGenre, selectedAlpha, selectedCountry, sortBy, showFavoritesOnly, playlist]);

  return (
    <ConfigProvider theme={getAntdTheme()}>
      <div className={`${styles.appContainer} ${styles[`theme_${themeMode}`] || ""}`}>
        {/* Header with Compact Shard Select & Playlist Counter */}
        <header className={styles.header}>
          <div className={styles.logoGroup}>
            <CustomerServiceOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
            <h1 className={styles.logoTitle}>TN Web MIDI Studio</h1>
          </div>

          <div className={styles.headerControls}>
            <Link href="/">
              <Button type="default" icon={<HomeOutlined style={{ color: "#38bdf8" }} />}>
                Trang Chủ AI Landing
              </Button>
            </Link>
            {/* Quick Settings Drawer / Modal Button */}
            <Popover
              content={
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220, padding: "6px 0" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.themeTitle}</div>
                    <Select
                      value={themeMode}
                      style={{ width: "100%" }}
                      onChange={(val) => setThemeMode(val as ThemeMode)}
                      options={[
                        { value: "dark", label: "🌙 Dark Mode" },
                        { value: "light", label: "☀️ Light Mode" },
                        { value: "neon", label: "⚡ Neon Cyber" },
                        { value: "retro", label: "📻 Retro Gold" },
                      ]}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.langTitle}</div>
                    <Select
                      value={language}
                      style={{ width: "100%" }}
                      onChange={(val) => setLanguage(val as Language)}
                      options={[
                        { value: "vi", label: "🇻🇳 Tiếng Việt" },
                        { value: "en", label: "🇺🇸 English" },
                        { value: "ja", label: "🇯🇵 日本語" },
                      ]}
                    />
                  </div>
                </div>
              }
              trigger="click"
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />} type="default">
                Settings
              </Button>
            </Popover>

            <Button
              type="primary"
              icon={<UnorderedListOutlined />}
              onClick={() => setIsPlaylistOpen(true)}
              style={{ backgroundColor: "#0284c7" }}
            >
              {t.myPlaylist} <Badge count={playlist.length} overflowCount={99} style={{ backgroundColor: "#818cf8", marginLeft: 6 }} />
            </Button>
          </div>
        </header>

        {/* Main Content Layout - 100% Full Width */}
        <div className={styles.mainLayout}>
          <main className={styles.contentArea}>
            {/* Clean & Streamlined Toolbar Header Bar */}
            <div className={styles.tableHeaderBar}>
              <div className={styles.tableTitleInfo}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Library Tracks</h2>
                <Badge count={`${processedTracks.length} tracks`} overflowCount={99999} style={{ backgroundColor: "#0284c7" }} />
              </div>

              <div className={styles.toolbarRight}>
                <div className={styles.searchBox}>
                  <Input
                    placeholder={t.searchPlaceholder}
                    prefix={<SearchOutlined />}
                    allowClear
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                <Select
                  value={selectedGenre}
                  style={{ width: 130 }}
                  onChange={(val) => setSelectedGenre(val)}
                  options={[
                    { value: "ALL", label: t.allGenres },
                    { value: "Pop", label: t.pop },
                    { value: "Rock", label: t.rock },
                    { value: "Country", label: t.country },
                    { value: "Jazz", label: t.jazz },
                    { value: "Classical", label: t.classical },
                    { value: "Electronic", label: t.electronic },
                    { value: "Soundtrack", label: t.soundtrack },
                  ]}
                />

                <Select
                  value={selectedCountry}
                  style={{ width: 140 }}
                  onChange={(val) => setSelectedCountry(val)}
                  options={[
                    { value: "ALL", label: t.globalAll },
                    { value: "US_EU", label: t.usEu },
                    { value: "ASIA", label: t.asia },
                  ]}
                />

                <Button
                  type={showFavoritesOnly ? "primary" : "default"}
                  danger={showFavoritesOnly}
                  icon={showFavoritesOnly ? <HeartFilled /> : <HeartOutlined />}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  {showFavoritesOnly ? t.favoritesOnly : t.allTracks}
                </Button>

                <Segmented
                  options={[
                    { value: "table", icon: <BarsOutlined />, tooltip: t.tableMode },
                    { value: "grid", icon: <AppstoreOutlined />, tooltip: t.gridMode },
                    { value: "compact", icon: <MenuOutlined />, tooltip: t.compactMode },
                    { value: "vinyl", icon: <CompassOutlined />, tooltip: t.vinylMode },
                  ]}
                  value={viewMode}
                  onChange={(val) => setViewMode(val as "table" | "grid" | "compact" | "vinyl")}
                />
              </div>
            </div>

            {/* A-Z Quick Filter Bar */}
            <div className={styles.alphaBar} role="tablist" aria-label="Alphabet Filter">
              {ALPHA_KEYS.map((key) => (
                <button
                  key={key}
                  tabIndex={0}
                  role="tab"
                  aria-selected={selectedAlpha === key}
                  aria-label={`Filter artists starting with ${key}`}
                  className={`${styles.alphaBtn} ${selectedAlpha === key ? styles.alphaBtnActive : ""}`}
                  onClick={() => setSelectedAlpha(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedAlpha(key);
                    }
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Modular Track List View Component (Table / Grid / Compact / Vinyl) */}
            {loading ? (
              <div className={styles.tableContainer} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spin description="Mounting SQLite Shard via Web Worker..." size="large" />
              </div>
            ) : (
              <TrackListView
                viewMode={viewMode}
                tracks={processedTracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                playlist={playlist}
                searchQuery={searchQuery}
                playTrack={playTrack}
                togglePlay={togglePlay}
                togglePlaylistTrack={togglePlaylistTrack}
                downloadMidiFile={downloadMidiFile}
                onOpenStage={(track) => {
                  setStageTrack(track);
                  setIsStageOpen(true);
                }}
              />
            )}
          </main>
        </div>

        {/* My Playlist Drawer */}
        <Drawer
          title={`My Favorite Playlist (${playlist.length} tracks)`}
          placement="right"
          onClose={() => setIsPlaylistOpen(false)}
          open={isPlaylistOpen}
          style={{ width: 380, maxWidth: "100vw" }}
          styles={{ body: { padding: 16 } }}
          extra={
            <Button
              type="link"
              size="small"
              onClick={() => savePlaylistToStorage(DEFAULT_PRESETS)}
            >
              Reset to Preset
            </Button>
          }
        >
          {playlist.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", marginTop: 40 }}>
              <HeartOutlined style={{ fontSize: 36, marginBottom: 12 }} />
              <div>Your playlist is empty. Click the heart icon on any track to add it here.</div>
            </div>
          ) : (
            playlist.map((track, i) => (
              <div
                key={track.id}
                className={styles.playlistRowItem}
                onClick={() => {
                  playTrack(track);
                  setIsPlaylistOpen(false);
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>{i + 1}. {track.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{track.artist}</div>
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromPlaylist(track.id);
                  }}
                />
              </div>
            ))
          )}
        </Drawer>

        {/* Standalone Footer Player Component */}
        <FooterPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          volume={volume}
          isMuted={isMuted}
          loopMode={loopMode}
          playlistLength={playlist.length}
          togglePlay={togglePlay}
          setLoopMode={setLoopMode}
          setIsMuted={setIsMuted}
          setVolume={setVolume}
          onOpenPlaylist={() => setIsPlaylistOpen(true)}
          onOpenStage={() => {
            if (currentTrack) {
              setStageTrack(currentTrack);
              setIsStageOpen(true);
            }
          }}
          formatTime={formatTime}
        />

        {/* Multi-Mode Stage Visualizer Modal (Synced with Main Player) */}
        <MultiModeVisualizerModal
          open={isStageOpen}
          onClose={() => setIsStageOpen(false)}
          track={stageTrack || currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          activeMidiNote={activeMidiNote}
          enabledInstruments={enabledInstruments}
          setEnabledInstruments={setEnabledInstruments}
          togglePlay={togglePlay}
          playTrack={playTrack}
          getMidiUrl={getMidiUrl}
          formatTime={formatTime}
        />
      </div>
    </ConfigProvider>
  );
}

export default function StudioPage() {
  return (
    <AppSettingsProvider>
      <MainStudioContent />
    </AppSettingsProvider>
  );
}
