"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { message } from "antd";
import { TrackRecord } from "@/lib/sqlWorker";
import { loadParsedMidi } from "@/lib/midiLoader";
import { DEFAULT_STUDIO_SETTINGS, getStudioSettings, saveStudioSettings } from "../_lib/studioStorage";
import { StudioAudioEngine, ScheduledMidiNote } from "../_lib/studioAudioEngine";

interface UseStudioAudioPlayerProps {
  playlist: TrackRecord[];
  tracks: TrackRecord[];
  enabledInstruments: Record<string, boolean>;
}

// Helper: Classify Instrument Type
function getInstType(channel: number, name: string = "", program: number = 0): string {
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

export function useStudioAudioPlayer({
  playlist,
  tracks,
  enabledInstruments,
}: UseStudioAudioPlayerProps) {
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioStatus, setAudioStatus] = useState<string>("Ready");
  const [activeMidiNote, setActiveMidiNote] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const [volume, setVolume] = useState<number>(DEFAULT_STUDIO_SETTINGS.volume);
  const [isMuted, setIsMuted] = useState<boolean>(DEFAULT_STUDIO_SETTINGS.isMuted);
  const [loopMode, setLoopMode] = useState<"off" | "one">(DEFAULT_STUDIO_SETTINGS.loopMode);
  const [originalBpm, setOriginalBpm] = useState<number>(120);
  const [tempoBpm, setTempoBpm] = useState<number>(DEFAULT_STUDIO_SETTINGS.tempoBpm || 120);

  const tempoBpmRef = useRef<number>(tempoBpm);
  const originalBpmRef = useRef<number>(originalBpm);
  const loopModeRef = useRef<"off" | "one">(loopMode);
  const playlistRef = useRef<TrackRecord[]>(playlist);
  const currentTrackRef = useRef<TrackRecord | null>(currentTrack);

  useEffect(() => {
    tempoBpmRef.current = tempoBpm;
  }, [tempoBpm]);

  useEffect(() => {
    originalBpmRef.current = originalBpm;
  }, [originalBpm]);

  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Load saved settings from storage
  useEffect(() => {
    const settings = getStudioSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVolume(settings.volume);
    setIsMuted(settings.isMuted);
    setLoopMode(settings.loopMode);
    if (settings.tempoBpm) {
      const bpm = Math.round(settings.tempoBpm);
      setTempoBpm(bpm);
      tempoBpmRef.current = bpm;
    }
  }, []);

  // Singleton Audio Engine Instance
  const engine = useMemo(() => StudioAudioEngine.getInstance(), []);

  // Track playback state changes
  const playTrackRef = useRef<(track: TrackRecord, startFromTime?: number, soloTrackIndex?: number | "all") => Promise<void>>(
    async () => {}
  );

  // Wire Singleton Audio Engine Listeners
  useEffect(() => {
    engine.setListeners({
      onTick: (currTime, activeNote) => {
        setCurrentTime(currTime);
        setActiveMidiNote(activeNote);
      },
      onStatusChange: (status) => {
        setAudioStatus(status);
      },
      onError: (err) => {
        console.error("Audio Engine Error:", err);
        setAudioStatus(`Error: ${err.message}`);
        setIsPlaying(false);
      },
      onTrackEnded: () => {
        const track = currentTrackRef.current;
        if (!track) return;

        if (loopModeRef.current === "one") {
          playTrackRef.current(track, 0);
        } else {
          const pList = playlistRef.current;
          const playlistIndex = pList.findIndex((t) => t.id === track.id);
          if (playlistIndex !== -1 && playlistIndex < pList.length - 1) {
            playTrackRef.current(pList[playlistIndex + 1], 0);
          } else {
            setIsPlaying(false);
            setActiveMidiNote(null);
            setAudioStatus("Finished");
          }
        }
      },
    });
  }, [engine]);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    saveStudioSettings({ volume: vol });
  }, []);

  const handleMutedChange = useCallback((muted: boolean) => {
    setIsMuted(muted);
    saveStudioSettings({ isMuted: muted });
  }, []);

  const handleLoopModeChange = useCallback((mode: "off" | "one") => {
    setLoopMode(mode);
    saveStudioSettings({ loopMode: mode });
  }, []);

  const pausePlayback = useCallback(() => {
    engine.pause();
    setIsPlaying(false);
    setActiveMidiNote(null);
    setAudioStatus("Paused");
  }, [engine]);

  const playSingleNote = useCallback(
    async (midiNote: number) => {
      try {
        await engine.playSingleNote(midiNote, volume, isMuted);
        setActiveMidiNote(midiNote);
        setTimeout(() => {
          setActiveMidiNote((prev) => (prev === midiNote ? null : prev));
        }, 350);
      } catch (err) {
        console.warn("Failed to play single note", err);
      }
    },
    [engine, isMuted, volume]
  );

  const playTrack = useCallback(
    async (
      track: TrackRecord,
      startFromTime: number = 0,
      soloTrackIndex?: number | "all"
    ) => {
      pausePlayback();
      const isNewTrack = !currentTrackRef.current || currentTrackRef.current.id !== track.id;
      const actualStartTime = isNewTrack ? 0 : Math.max(0, startFromTime);

      setCurrentTrack(track);
      currentTrackRef.current = track;
      setCurrentTime(actualStartTime);

      try {
        setAudioStatus("Loading SoundFont & MIDI...");
        const midi = await loadParsedMidi(track.file_path);
        setTotalDuration(midi.duration);
        setAudioStatus("Playing MIDI Audio...");
        setIsPlaying(true);

        // Detect Track Original Integer BPM
        const rawBpm = midi.header.tempos && midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
        const trackBpm = Math.max(30, Math.min(300, Math.round(rawBpm)));
        setOriginalBpm(trackBpm);
        originalBpmRef.current = trackBpm;

        const currentBpm = tempoBpmRef.current || trackBpm;
        const speed = Math.max(0.2, Math.min(4.0, currentBpm / trackBpm));

        // Filter target tracks if solo mode is requested
        let targetTracks = midi.tracks.filter((t) => t.notes.length > 0);
        if (soloTrackIndex !== undefined && soloTrackIndex !== "all") {
          if (midi.tracks[soloTrackIndex]) {
            targetTracks = [midi.tracks[soloTrackIndex]];
          }
        }

        // Prepare and sort all playback notes chronologically
        const notesToPlay: ScheduledMidiNote[] = [];
        const scheduledVoiceMap = new Map<string, boolean>();

        targetTracks.forEach((t) => {
          const programNumber = t.instrument?.number || 0;
          const instType = getInstType(t.channel || 0, t.name || "", programNumber);

          t.notes.forEach((note) => {
            if (note.time < actualStartTime) return;

            // Merge duplicate voice triggers within 30ms window
            const quantizedTime = Math.round(note.time * 33) / 33;
            const voiceKey = `${instType}_${note.midi}_${quantizedTime}`;
            if (scheduledVoiceMap.has(voiceKey)) return;
            scheduledVoiceMap.set(voiceKey, true);

            notesToPlay.push({
              midi: note.midi,
              time: note.time,
              duration: Math.max(0.08, note.duration),
              velocity: note.velocity,
              instType,
            });
          });
        });

        await engine.playNotes({
          notes: notesToPlay,
          totalDuration: midi.duration,
          startFromTime: actualStartTime,
          speedMultiplier: speed,
          volume,
          isMuted,
          enabledInstruments,
          soloTrackIndex,
        });
      } catch (err) {
        console.error("Playback error", err);
        setAudioStatus(`Error: ${(err as Error).message}`);
        setIsPlaying(false);
      }
    },
    [enabledInstruments, engine, isMuted, pausePlayback, volume]
  );

  const handleTempoBpmChange = useCallback(
    (bpm: number) => {
      const rounded = Math.max(30, Math.min(300, Math.round(bpm)));
      setTempoBpm(rounded);
      tempoBpmRef.current = rounded;
      saveStudioSettings({ tempoBpm: rounded });
      if (isPlaying && currentTrack) {
        playTrack(currentTrack, currentTime);
      }
    },
    [currentTrack, currentTime, isPlaying, playTrack]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else if (currentTrack) {
      playTrack(currentTrack, currentTime);
    }
  }, [currentTrack, currentTime, isPlaying, pausePlayback, playTrack]);

  const handleSeek = useCallback(
    (newTime: number) => {
      setCurrentTime(newTime);
      if (currentTrack && isPlaying) {
        playTrack(currentTrack, newTime);
      }
    },
    [currentTrack, isPlaying, playTrack]
  );

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  // Keyboard Shortcuts (Space: Play/Pause, M: Mute/Unmute)
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
        setIsMuted((prev) => {
          const next = !prev;
          saveStudioSettings({ isMuted: next });
          message.info(next ? "Audio Muted" : "Audio Unmuted");
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTrack, isPlaying, tracks, playTrack, togglePlay]);

  return {
    currentTrack,
    setCurrentTrack,
    isPlaying,
    setIsPlaying,
    audioStatus,
    activeMidiNote,
    currentTime,
    totalDuration,
    volume,
    isMuted,
    loopMode,
    tempoBpm,
    originalBpm,
    handleVolumeChange,
    handleMutedChange,
    handleLoopModeChange,
    setTempoBpm: handleTempoBpmChange,
    pausePlayback,
    playTrack,
    playSingleNote,
    togglePlay,
    handleSeek,
    formatTime,
  };
}

