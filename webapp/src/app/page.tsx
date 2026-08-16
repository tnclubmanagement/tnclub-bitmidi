"use client";

import React, { useEffect, useState, useRef } from "react";
import { Menu, Input, Spin, Badge, Button, ConfigProvider, theme } from "antd";
import { SoundOutlined, SearchOutlined, PlayCircleFilled, PauseCircleFilled } from "@ant-design/icons";
import { Virtuoso } from "react-virtuoso";
import { MasterIndexEntry, TrackRecord, createShardWorker, fetchTracksFromShard } from "@/lib/sqlWorker";
import type { WorkerHttpvfs } from "sql.js-httpvfs";
import { Midi } from "@tonejs/midi";
import { Soundfont } from "smplr";
import styles from "./app.module.css";

export default function Home() {
  const [masterIndex, setMasterIndex] = useState<MasterIndexEntry[]>([]);
  const [selectedShard, setSelectedShard] = useState<string>("");
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioStatus, setAudioStatus] = useState<string>("Ready");

  const workerRef = useRef<WorkerHttpvfs | null>(null);
  const soundfontRef = useRef<Soundfont | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTimeoutsRef = useRef<number[]>([]);

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

  // Mount/Switch Web Worker when selectedShard changes
  useEffect(() => {
    if (!selectedShard) return;

    let isMounted = true;

    async function initWorker() {
      setLoading(true);
      if (workerRef.current) {
        try {
          // Comlink releaseProxy to properly close Worker connection without error
          const comlinkWorker = workerRef.current.worker as unknown as { [Symbol.dispose]?: () => void; releaseProxy?: () => void };
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
    // Encode each path segment individually to handle spaces and special characters like "Weird Al" Yankovic
    const encodedSegments = relPath.split("/").map((segment) => encodeURIComponent(segment));
    return `/midi/${encodedSegments.join("/")}`;
  };

  const clearActiveNotes = () => {
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current = [];
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

      const midiUrl = getMidiUrl(track.file_path);
      const res = await fetch(midiUrl);
      if (!res.ok) {
        throw new Error(`MIDI file not found (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();

      // Parse MIDI file via @tonejs/midi
      const midi = new Midi(arrayBuffer);
      setAudioStatus("Playing MIDI Audio...");
      setIsPlaying(true);

      // Schedule all notes using smplr SoundFont Player
      midi.tracks.forEach((t) => {
        t.notes.forEach((note) => {
          const delayMs = note.time * 1000;
          const timeoutId = window.setTimeout(() => {
            if (soundfontRef.current) {
              soundfontRef.current.start({
                note: note.midi,
                velocity: Math.floor(note.velocity * 127),
                duration: note.duration,
              });
            }
          }, delayMs);
          activeTimeoutsRef.current.push(timeoutId);
        });
      });

      // Set finish timer
      const totalDurationMs = midi.duration * 1000;
      const endTimeoutId = window.setTimeout(() => {
        setIsPlaying(false);
        setAudioStatus("Finished");
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

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className={styles.appContainer}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logoGroup}>
            <SoundOutlined style={{ fontSize: 24, color: "#38bdf8" }} />
            <h1 className={styles.logoTitle}>BitMIDI Local Explorer</h1>
            <span className={styles.badge}>HTTP Range Requests</span>
          </div>
          <div>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              Total Loaded Shards: <strong>{masterIndex.length}</strong>
            </span>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className={styles.mainLayout}>
          {/* Sidebar Shard Navigator */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}>Artist Ranges (Shards)</div>
            <Menu
              mode="inline"
              selectedKeys={[selectedShard]}
              onClick={({ key }) => setSelectedShard(key)}
              items={masterIndex.map((entry) => ({
                key: entry.shard as string,
                label: `${entry.start_artist} — ${entry.end_artist}`,
              }))}
              style={{ background: "transparent", borderRight: "none" }}
            />
          </aside>

          {/* Main Area */}
          <main className={styles.contentArea}>
            <div className={styles.tableHeaderBar}>
              <div className={styles.tableTitleInfo}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Track Listing</h2>
                <Badge count={`${tracks.length} tracks`} overflowCount={99999} style={{ backgroundColor: "#0284c7" }} />
              </div>
              <div className={styles.searchBox}>
                <Input
                  placeholder="Search title or artist..."
                  prefix={<SearchOutlined />}
                  allowClear
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Virtualized Table */}
            <div className={styles.tableContainer}>
              {loading ? (
                <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Spin tip="Mounting SQLite Shard via Web Worker..." size="large" />
                </div>
              ) : (
                <Virtuoso
                  style={{ height: "100%", width: "100%" }}
                  totalCount={tracks.length}
                  itemContent={(index) => {
                    const track = tracks[index];
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <div
                        className={`${styles.tableRow} ${isSelected ? styles.tableRowActive : ""}`}
                        onClick={() => playTrack(track)}
                      >
                        <div className={styles.colTitle}>{track.title}</div>
                        <div className={styles.colArtist}>{track.artist}</div>
                        <div className={styles.colAction}>
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
              )}
            </div>
          </main>
        </div>

        {/* Sticky Player Footer */}
        <footer className={styles.footerPlayer}>
          <div className={styles.playingInfo}>
            <SoundOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {currentTrack ? currentTrack.title : "No track selected"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                {currentTrack ? currentTrack.artist : "Click a track to start playback"}
              </div>
            </div>
          </div>

          <div className={styles.audioControls}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
              disabled={!currentTrack}
              onClick={togglePlay}
            />
          </div>

          <div style={{ width: 220, textAlign: "right", color: "#64748b", fontSize: "0.8rem" }}>
            Status: <strong style={{ color: isPlaying ? "#38bdf8" : "#94a3b8" }}>{audioStatus}</strong>
          </div>
        </footer>
      </div>
    </ConfigProvider>
  );
}
