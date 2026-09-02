"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { message } from "antd";
import { Soundfont } from "smplr";
import { TrackRecord } from "@/lib/sqlWorker";
import { loadParsedMidi } from "@/lib/midiLoader";
import { DEFAULT_STUDIO_SETTINGS, getStudioSettings, saveStudioSettings } from "../_lib/studioStorage";

interface UseStudioAudioPlayerProps {
  playlist: TrackRecord[];
  tracks: TrackRecord[];
  enabledInstruments: Record<string, boolean>;
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

  useEffect(() => {
    tempoBpmRef.current = tempoBpm;
  }, [tempoBpm]);

  useEffect(() => {
    originalBpmRef.current = originalBpm;
  }, [originalBpm]);

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

  // Worker & Audio Refs
  const soundfontRef = useRef<Soundfont | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeTimeoutsRef = useRef<number[]>([]);
  const playbackTimerRef = useRef<number | null>(null);

  const nextScheduleIndexRef = useRef<number>(0);
  const sortedPlaybackNotesRef = useRef<
    Array<{ midi: number; time: number; duration: number; velocity: number; instType: string }>
  >([]);

  // Keep enabledInstruments in a Ref to avoid re-triggering component re-renders
  const enabledInstrumentsRef = useRef(enabledInstruments);
  useEffect(() => {
    enabledInstrumentsRef.current = enabledInstruments;
  }, [enabledInstruments]);

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
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current = [];
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    sortedPlaybackNotesRef.current = [];
    nextScheduleIndexRef.current = 0;
    setActiveMidiNote(null);
    if (soundfontRef.current) {
      soundfontRef.current.stop();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.suspend();
    }
  }, []);

  const initSoundfont = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  }, []);

  const playSingleNote = useCallback(
    async (midiNote: number) => {
      try {
        await initSoundfont();
        if (soundfontRef.current && audioCtxRef.current) {
          const targetVol = isMuted ? 0 : volume / 100;
          soundfontRef.current.start({
            note: midiNote,
            velocity: Math.max(20, Math.floor(0.85 * 127 * targetVol)),
            duration: 0.6,
            time: audioCtxRef.current.currentTime,
          });
          setActiveMidiNote(midiNote);
          setTimeout(() => {
            setActiveMidiNote((prev) => (prev === midiNote ? null : prev));
          }, 350);
        }
      } catch (err) {
        console.warn("Failed to play single note", err);
      }
    },
    [initSoundfont, isMuted, volume]
  );

  const currentTrackRef = useRef<TrackRecord | null>(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const playTrackRef = useRef<(track: TrackRecord, startFromTime?: number, soloTrackIndex?: number | "all") => Promise<void>>(
    async () => {}
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
        await initSoundfont();

        const midi = await loadParsedMidi(track.file_path);
        setTotalDuration(midi.duration);
        setAudioStatus("Playing MIDI Audio...");
        setIsPlaying(true);

        // Detect Track Original Integer BPM
        const rawBpm = midi.header.tempos && midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
        const trackBpm = Math.max(30, Math.min(300, Math.round(rawBpm)));
        setOriginalBpm(trackBpm);
        originalBpmRef.current = trackBpm;

        // High-Precision Native Web Audio Engine (Microsecond-precise C++ clock)
        const audioCtx = audioCtxRef.current;
        if (audioCtx && audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        const currentBpm = tempoBpmRef.current || trackBpm;
        const speed = Math.max(0.2, Math.min(4.0, currentBpm / trackBpm));
        const audioStartCtxTime = audioCtx ? audioCtx.currentTime : 0;
        const initialCurrentTime = actualStartTime;
        let fallbackTs = 0;

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

        // Filter target tracks if solo mode is requested
        let targetTracks = midi.tracks.filter((t) => t.notes.length > 0);
        if (soloTrackIndex !== undefined && soloTrackIndex !== "all") {
          if (midi.tracks[soloTrackIndex]) {
            targetTracks = [midi.tracks[soloTrackIndex]];
          }
        }

        // Prepare and sort all playback notes chronologically
        const notesToPlay: Array<{
          midi: number;
          time: number;
          duration: number;
          velocity: number;
          instType: string;
        }> = [];
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

        notesToPlay.sort((a, b) => a.time - b.time);
        sortedPlaybackNotesRef.current = notesToPlay;
        nextScheduleIndexRef.current = 0;

        // Rolling Lookahead Web Audio Loop (0.25s lookahead window)
        const scheduleAheadSec = 0.25;

        playbackTimerRef.current = window.setInterval(() => {
          let elapsedRealAudioSec = 0;
          if (audioCtx) {
            elapsedRealAudioSec = audioCtx.currentTime - audioStartCtxTime;
          } else {
            if (!fallbackTs) fallbackTs = Date.now();
            elapsedRealAudioSec = (Date.now() - fallbackTs) / 1000;
          }

          const currentTrackBpm = originalBpmRef.current || 120;
          const userBpm = tempoBpmRef.current || currentTrackBpm;
          const currentSpeed = Math.max(0.2, Math.min(4.0, userBpm / currentTrackBpm));
          const currentElapsedTrackSec = initialCurrentTime + elapsedRealAudioSec * currentSpeed;

          if (currentElapsedTrackSec <= midi.duration) {
            setCurrentTime(currentElapsedTrackSec);
          } else {
            setCurrentTime(midi.duration);
          }

          // Schedule rolling lookahead window
          if (audioCtx && soundfontRef.current) {
            const windowEndTrackSec = currentElapsedTrackSec + scheduleAheadSec * currentSpeed;
            const notes = sortedPlaybackNotesRef.current;
            let idx = nextScheduleIndexRef.current;

            while (idx < notes.length) {
              const n = notes[idx];
              if (n.time > windowEndTrackSec) break;
              if (n.time >= currentElapsedTrackSec - 0.05 * currentSpeed) {
                if (soloTrackIndex !== "all" || enabledInstrumentsRef.current[n.instType]) {
                  const timeUntilNoteAudioSec = Math.max(0, (n.time - currentElapsedTrackSec) / currentSpeed);
                  const noteCtxTime = audioCtx.currentTime + timeUntilNoteAudioSec;
                  soundfontRef.current.start({
                    note: n.midi,
                    velocity: Math.floor(n.velocity * 127 * targetVolume),
                    duration: Math.max(0.05, n.duration / currentSpeed),
                    time: noteCtxTime,
                  });
                }
              }
              idx++;
            }
            nextScheduleIndexRef.current = idx;
          }

          // Track currently sounding active MIDI note for interactive visualizer
          const notesList = sortedPlaybackNotesRef.current;
          let activeNoteFound: number | null = null;
          for (let i = 0; i < notesList.length; i++) {
            const n = notesList[i];
            if (n.time <= currentElapsedTrackSec && currentElapsedTrackSec <= n.time + n.duration) {
              if (soloTrackIndex !== "all" || enabledInstrumentsRef.current[n.instType]) {
                activeNoteFound = n.midi;
              }
            } else if (n.time > currentElapsedTrackSec + 0.2 * currentSpeed) {
              break;
            }
          }
          setActiveMidiNote(activeNoteFound);
        }, 40);

        const totalRemainingAudioMs = Math.max(0, ((midi.duration - actualStartTime) / speed) * 1000);
        const endTimeoutId = window.setTimeout(() => {
          if (loopMode === "one") {
            playTrackRef.current(track, 0, soloTrackIndex);
          } else {
            const playlistIndex = playlist.findIndex((t) => t.id === track.id);
            if (playlistIndex !== -1 && playlistIndex < playlist.length - 1) {
              playTrackRef.current(playlist[playlistIndex + 1], 0);
            } else {
              setIsPlaying(false);
              setActiveMidiNote(null);
              setAudioStatus("Finished");
            }
          }
        }, totalRemainingAudioMs);
        activeTimeoutsRef.current.push(endTimeoutId);
      } catch (err) {
        console.error("Playback error", err);
        setAudioStatus(`Error: ${(err as Error).message}`);
        setIsPlaying(false);
      }
    },
    [initSoundfont, isMuted, loopMode, pausePlayback, playlist, volume]
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
      setIsPlaying(false);
      setAudioStatus("Paused");
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
