"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Input, Spin, Badge, Button, Select, ConfigProvider, theme, Segmented, Tooltip, Slider, Drawer, message } from "antd";
import {
  SoundOutlined,
  SearchOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  CustomerServiceOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DownloadOutlined,
  RedoOutlined,
  MutedOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  HeartFilled,
  UnorderedListOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { MasterIndexEntry, TrackRecord, createShardWorker, fetchTracksFromShard } from "@/lib/sqlWorker";
import type { WorkerHttpvfs } from "sql.js-httpvfs";
import { Midi } from "@tonejs/midi";
import { Soundfont } from "smplr";
import HeroBanner from "@/components/HeroBanner";
import MultiModeVisualizerModal from "@/components/MultiModeVisualizerModal";
import styles from "./app.module.css";

const ALPHA_KEYS = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export default function Home() {
  const [masterIndex, setMasterIndex] = useState<MasterIndexEntry[]>([]);
  const [selectedShard, setSelectedShard] = useState<string>("");
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAlpha, setSelectedAlpha] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("artist_asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [loading, setLoading] = useState<boolean>(true);

  // Preset Curated Playlists (Spotify / Apple Music Style)
  const DEFAULT_PRESETS: TrackRecord[] = useMemo(() => [
    { id: "preset_1", title: "Amish Paradise", artist: "\"Weird Al\" Yankovic", file_path: "clean_midi/Yankovic, \"Weird Al\"/Amish Paradise.mid" },
    { id: "preset_2", title: "A Night To Remember", artist: "911", file_path: "clean_midi/911/A Night To Remember.mid" },
    { id: "preset_3", title: "Don't Look Back In Anger", artist: "Oasis", file_path: "clean_midi/Oasis/Don't Look Back In Anger.mid" },
    { id: "preset_4", title: "Bohemian Rhapsody", artist: "Queen", file_path: "clean_midi/Queen/Bohemian Rhapsody.mid" },
    { id: "preset_5", title: "Canon in D", artist: "Johann Pachelbel", file_path: "clean_midi/Pachelbel/Canon in D.mid" },
  ], []);

  // Playlist & Favorites State (Lazy Initialized with Curated Default Presets)
  const [playlist, setPlaylist] = useState<TrackRecord[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPlaylist = localStorage.getItem("tn_midi_playlist");
        if (savedPlaylist && JSON.parse(savedPlaylist).length > 0) {
          return JSON.parse(savedPlaylist);
        }
      } catch (e) {
        console.warn("Failed to load playlist from localStorage", e);
      }
    }
    return [
      { id: "preset_1", title: "Amish Paradise", artist: "\"Weird Al\" Yankovic", file_path: "clean_midi/Yankovic, \"Weird Al\"/Amish Paradise.mid" },
      { id: "preset_2", title: "A Night To Remember", artist: "911", file_path: "clean_midi/911/A Night To Remember.mid" },
      { id: "preset_3", title: "Don't Look Back In Anger", artist: "Oasis", file_path: "clean_midi/Oasis/Don't Look Back In Anger.mid" },
      { id: "preset_4", title: "Bohemian Rhapsody", artist: "Queen", file_path: "clean_midi/Queen/Bohemian Rhapsody.mid" },
      { id: "preset_5", title: "Canon in D", artist: "Johann Pachelbel", file_path: "clean_midi/Pachelbel/Canon in D.mid" },
    ];
  });
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);

  // Multi-Mode Stage Visualizer Modal State
  const [stageTrack, setStageTrack] = useState<TrackRecord | null>(null);
  const [isStageOpen, setIsStageOpen] = useState<boolean>(false);

  // Player States
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioStatus, setAudioStatus] = useState<string>("Ready");
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
        const res = await fetch("/db/master_index.json");
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
  }, [selectedShard]);

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
    return `/midi/${encodedSegments.join("/")}`;
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

  const clearActiveNotes = () => {
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

      // Start Time Updater
      playbackTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.2;
          return next <= midi.duration ? next : midi.duration;
        });
      }, 200);

      // Schedule notes with Volume Control
      const targetVolume = isMuted ? 0 : volume / 100;

      midi.tracks.forEach((t) => {
        t.notes.forEach((note) => {
          const delayMs = note.time * 1000;
          const timeoutId = window.setTimeout(() => {
            if (soundfontRef.current) {
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

      const totalDurationMs = midi.duration * 1000;
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
      clearActiveNotes();
      setIsPlaying(false);
      setAudioStatus("Paused");
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
  };

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

    if (selectedAlpha !== "ALL") {
      result = result.filter((t) =>
        t.artist.toUpperCase().startsWith(selectedAlpha)
      );
    }

    if (selectedCountry !== "ALL") {
      result = result.filter((t) => {
        const charCode = t.artist.charCodeAt(0) || 0;
        if (selectedCountry === "US_EU") return charCode < 128;
        if (selectedCountry === "ASIA") return charCode >= 128 || t.artist.toLowerCase().includes("japan") || t.artist.toLowerCase().includes("korea");
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
  }, [tracks, selectedAlpha, selectedCountry, sortBy, showFavoritesOnly, playlist]);

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className={styles.appContainer}>
        {/* Header with Compact Shard Select & Playlist Counter */}
        <header className={styles.header}>
          <div className={styles.logoGroup}>
            <CustomerServiceOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
            <h1 className={styles.logoTitle}>TN Web MIDI Studio</h1>
            <span className={styles.badge}>Local-First SQLite Engine</span>
          </div>

          <div className={styles.headerControls}>
            <Button
              type="primary"
              icon={<UnorderedListOutlined />}
              onClick={() => setIsPlaylistOpen(true)}
              style={{ backgroundColor: "#0284c7" }}
            >
              My Playlist <Badge count={playlist.length} overflowCount={99} style={{ backgroundColor: "#818cf8", marginLeft: 6 }} />
            </Button>

            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Artists Shard:</span>
            <Select
              className={styles.shardSelectHeader}
              value={selectedShard}
              onChange={(val) => setSelectedShard(val)}
              options={masterIndex.map((entry) => ({
                value: entry.shard as string,
                label: `${entry.start_artist} — ${entry.end_artist}`,
              }))}
            />
          </div>
        </header>

        {/* Main Content Layout - 100% Full Width */}
        <div className={styles.mainLayout}>
          <main className={styles.contentArea}>
            {/* Hero Brand Onboarding */}
            <HeroBanner />

            {/* Toolbar Header Bar */}
            <div className={styles.tableHeaderBar}>
              <div className={styles.tableTitleInfo}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Library Tracks</h2>
                <Badge count={`${processedTracks.length} tracks`} overflowCount={99999} style={{ backgroundColor: "#0284c7" }} />
              </div>

              <div className={styles.toolbarRight}>
                <Button
                  type={showFavoritesOnly ? "primary" : "default"}
                  danger={showFavoritesOnly}
                  icon={showFavoritesOnly ? <HeartFilled /> : <HeartOutlined />}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  {showFavoritesOnly ? "Favorites Only" : "All Songs"}
                </Button>

                <Select
                  value={selectedGenre}
                  style={{ width: 140 }}
                  onChange={(val) => setSelectedGenre(val)}
                  options={[
                    { value: "ALL", label: "🎵 All Genres" },
                    { value: "Pop", label: "🎤 Pop" },
                    { value: "Rock", label: "🎸 Rock" },
                    { value: "Country", label: "🎻 Country" },
                    { value: "Jazz", label: "🎷 Jazz & Blues" },
                    { value: "Classical", label: "🎹 Classical" },
                    { value: "Electronic", label: "🎧 Electronic" },
                    { value: "Soundtrack", label: "🎬 Soundtrack" },
                  ]}
                />

                <Select
                  value={selectedCountry}
                  style={{ width: 150 }}
                  onChange={(val) => setSelectedCountry(val)}
                  options={[
                    { value: "ALL", label: "🌐 Global / All" },
                    { value: "US_EU", label: "🇺🇸 US & Europe" },
                    { value: "ASIA", label: "🌏 Asia & Anime" },
                  ]}
                />

                <Select
                  defaultValue="artist_asc"
                  style={{ width: 150 }}
                  onChange={(val) => setSortBy(val)}
                  options={[
                    { value: "artist_asc", label: "Artist (A-Z)" },
                    { value: "artist_desc", label: "Artist (Z-A)" },
                    { value: "title_asc", label: "Title (A-Z)" },
                    { value: "title_desc", label: "Title (Z-A)" },
                  ]}
                />

                <Segmented
                  options={[
                    { value: "table", icon: <BarsOutlined /> },
                    { value: "grid", icon: <AppstoreOutlined /> },
                  ]}
                  value={viewMode}
                  onChange={(val) => setViewMode(val as "table" | "grid")}
                />

                <div className={styles.searchBox}>
                  <Input
                    placeholder="Search title or artist..."
                    prefix={<SearchOutlined />}
                    allowClear
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* A-Z Quick Filter Bar */}
            <div className={styles.alphaBar}>
              {ALPHA_KEYS.map((key) => (
                <button
                  key={key}
                  className={`${styles.alphaBtn} ${selectedAlpha === key ? styles.alphaBtnActive : ""}`}
                  onClick={() => setSelectedAlpha(key)}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Content Display (Grid Cards / Table View) */}
            {loading ? (
              <div className={styles.tableContainer} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spin tip="Mounting SQLite Shard via Web Worker..." size="large" />
              </div>
            ) : viewMode === "grid" ? (
              <div className={styles.gridContainerWrapper}>
                <VirtuosoGrid
                  style={{ height: "100%", width: "100%" }}
                  totalCount={processedTracks.length}
                  listClassName={styles.gridListContainer}
                  itemClassName={styles.gridItemWrapper}
                  itemContent={(index) => {
                    const track = processedTracks[index];
                    const isSelected = currentTrack?.id === track.id;
                    const inPlaylist = playlist.some((t) => t.id === track.id);
                    return (
                      <div
                        className={`${styles.gridCard} ${isSelected ? styles.gridCardActive : ""}`}
                        onClick={() => playTrack(track)}
                      >
                        <div className={styles.cardHeaderRow}>
                          <span className={styles.cardNumberBadge}>No. #{index + 1}</span>
                          <span className={styles.formatBadge}>MIDI (.mid)</span>
                        </div>
                        <div className={styles.gridCardTitle}>{track.title}</div>
                        <div className={styles.gridCardArtist}>{track.artist}</div>
                        
                        <div className={styles.cardMetaRow}>
                          <span><ClockCircleOutlined /> 3:24</span>
                          <span>Audio Track</span>
                        </div>

                        <div className={styles.gridCardFooter}>
                          <Button
                            type="primary"
                            shape="circle"
                            size="small"
                            icon={isSelected && isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                togglePlay();
                              } else {
                                playTrack(track);
                              }
                            }}
                          />

                          <div>
                            <Tooltip title="Open Stage Visualizer (Synthesia, Sheet, Piano)">
                              <Button
                                type="text"
                                icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStageTrack(track);
                                  setIsStageOpen(true);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title={inPlaylist ? "Remove from Playlist" : "Add to Playlist"}>
                              <Button
                                type="text"
                                icon={
                                  inPlaylist ? (
                                    <HeartFilled style={{ color: "#ef4444" }} />
                                  ) : (
                                    <HeartOutlined style={{ color: "#94a3b8" }} />
                                  )
                                }
                                onClick={(e) => togglePlaylistTrack(e, track)}
                              />
                            </Tooltip>
                            <Tooltip title="Download .mid file">
                              <Button
                                type="text"
                                icon={<DownloadOutlined style={{ color: "#94a3b8" }} />}
                                onClick={(e) => downloadMidiFile(e, track)}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <Virtuoso
                  style={{ height: "100%", width: "100%" }}
                  totalCount={processedTracks.length}
                  itemContent={(index) => {
                    const track = processedTracks[index];
                    const isSelected = currentTrack?.id === track.id;
                    const inPlaylist = playlist.some((t) => t.id === track.id);
                    return (
                      <div
                        className={`${styles.tableRow} ${isSelected ? styles.tableRowActive : ""}`}
                        onClick={() => playTrack(track)}
                      >
                        <div className={styles.colNo}>#{index + 1}</div>
                        <div className={styles.colTitle}>{track.title}</div>
                        <div className={styles.colArtist}>{track.artist}</div>
                        <div className={styles.colDuration}>
                          <ClockCircleOutlined /> 3:24
                        </div>
                        <div className={styles.colFormat}>
                          <span className={styles.formatBadge}>MIDI</span>
                        </div>
                        <div className={styles.colAction}>
                          <Tooltip title="Open Stage Visualizer (Synthesia, Sheet, Piano)">
                            <Button
                              type="text"
                              icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setStageTrack(track);
                                setIsStageOpen(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={inPlaylist ? "Remove from Playlist" : "Add to Playlist"}>
                            <Button
                              type="text"
                              icon={
                                inPlaylist ? (
                                  <HeartFilled style={{ color: "#ef4444" }} />
                                ) : (
                                  <HeartOutlined style={{ color: "#94a3b8" }} />
                                )
                              }
                              onClick={(e) => togglePlaylistTrack(e, track)}
                            />
                          </Tooltip>
                          <Tooltip title="Download .mid file">
                            <Button
                              type="text"
                              icon={<DownloadOutlined style={{ color: "#94a3b8" }} />}
                              onClick={(e) => downloadMidiFile(e, track)}
                            />
                          </Tooltip>
                          <Button
                            type="text"
                            icon={
                              isSelected && isPlaying ? (
                                <PauseCircleFilled style={{ color: "#38bdf8", fontSize: 22 }} />
                              ) : (
                                <PlayCircleFilled style={{ color: isSelected ? "#38bdf8" : "#64748b", fontSize: 22 }} />
                              )
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                togglePlay();
                              } else {
                                playTrack(track);
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            )}
          </main>
        </div>

        {/* My Playlist Drawer */}
        <Drawer
          title={`My Favorite Playlist (${playlist.length} tracks)`}
          placement="right"
          onClose={() => setIsPlaylistOpen(false)}
          open={isPlaylistOpen}
          width={380}
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

        {/* Floating Glass Player Footer */}
        <footer className={styles.footerPlayer}>
          <div className={styles.playingInfo}>
            <SoundOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {currentTrack ? currentTrack.title : "No track selected"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                {currentTrack ? currentTrack.artist : "Select a track to start playback"}
              </div>
            </div>
          </div>

          <div className={styles.audioControlsCenter}>
            <div className={styles.buttonRow}>
              <Tooltip title={loopMode === "one" ? "Repeat One (Active)" : "Repeat Off"}>
                <Button
                  type="text"
                  icon={<RedoOutlined style={{ color: loopMode === "one" ? "#38bdf8" : "#64748b", fontSize: 18 }} />}
                  onClick={() => setLoopMode(loopMode === "one" ? "off" : "one")}
                />
              </Tooltip>
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
                disabled={!currentTrack}
                onClick={togglePlay}
              />
            </div>
            <div className={styles.seekRow}>
              <span className={styles.timeText}>{formatTime(currentTime)}</span>
              <Slider
                style={{ flex: 1, margin: 0 }}
                min={0}
                max={totalDuration || 100}
                value={currentTime}
                tooltip={{ formatter: (val) => formatTime(val || 0) }}
                disabled={!currentTrack}
              />
              <span className={styles.timeText}>{formatTime(totalDuration)}</span>
            </div>
          </div>

          <div className={styles.audioControlsRight}>
            <Tooltip title="Open Stage Visualizer">
              <Button
                type="default"
                icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
                disabled={!currentTrack}
                onClick={() => {
                  if (currentTrack) {
                    setStageTrack(currentTrack);
                    setIsStageOpen(true);
                  }
                }}
              >
                Stage Mode
              </Button>
            </Tooltip>

            <Button
              type="primary"
              ghost
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => setIsPlaylistOpen(true)}
            >
              Playlist ({playlist.length})
            </Button>
            <Button
              type="text"
              icon={
                isMuted ? (
                  <MutedOutlined style={{ color: "#ef4444", fontSize: 18 }} />
                ) : (
                  <SoundOutlined style={{ color: "#38bdf8", fontSize: 18 }} />
                )
              }
              onClick={() => setIsMuted(!isMuted)}
            />
            <Slider
              className={styles.volumeSlider}
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(val) => {
                setVolume(val);
                if (val > 0) setIsMuted(false);
              }}
            />
          </div>
        </footer>

        {/* Multi-Mode Stage Visualizer Modal */}
        <MultiModeVisualizerModal
          open={isStageOpen}
          onClose={() => setIsStageOpen(false)}
          track={stageTrack}
          getMidiUrl={getMidiUrl}
        />
      </div>
    </ConfigProvider>
  );
}
