import { Soundfont } from "smplr";

export interface ScheduledMidiNote {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
  instType: string;
}

export interface PlayMidiOptions {
  notes: ScheduledMidiNote[];
  totalDuration: number;
  startFromTime?: number;
  speedMultiplier?: number;
  volume?: number; // 0..100
  isMuted?: boolean;
  enabledInstruments?: Record<string, boolean>;
  soloTrackIndex?: number | "all";
}

export interface AudioEngineListeners {
  onTick?: (currentTime: number, activeMidiNote: number | null) => void;
  onTrackEnded?: () => void;
  onStatusChange?: (status: string) => void;
  onError?: (err: Error) => void;
}

/**
 * Singleton Audio Engine for Web MIDI SoundFont Synthesis
 * Handles high-precision Web Audio clock scheduling, audio context lifecycle,
 * and single-instance soundfont loading.
 */
export class StudioAudioEngine {
  private static instance: StudioAudioEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private soundfont: Soundfont | null = null;
  private isSoundfontLoaded = false;
  private soundfontLoadingPromise: Promise<void> | null = null;

  private playbackTimer: number | null = null;
  private endTimeoutId: number | null = null;

  private sortedNotes: ScheduledMidiNote[] = [];
  private nextScheduleIndex = 0;
  private isPlaying = false;

  private listeners: AudioEngineListeners = {};

  private constructor() {
    // Private constructor ensures Singleton pattern
  }

  public static getInstance(): StudioAudioEngine {
    if (!StudioAudioEngine.instance) {
      StudioAudioEngine.instance = new StudioAudioEngine();
    }
    return StudioAudioEngine.instance;
  }

  public setListeners(listeners: AudioEngineListeners): void {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * Initializes or resumes the AudioContext and loads SoundFont instruments once
   */
  public async init(): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    if (!this.isSoundfontLoaded && !this.soundfontLoadingPromise && this.audioCtx) {
      this.listeners.onStatusChange?.("Loading Piano SoundFont...");
      this.soundfont = new Soundfont(this.audioCtx, {
        instrument: "acoustic_grand_piano",
      });

      this.soundfontLoadingPromise = this.soundfont.load.then(() => {
        this.isSoundfontLoaded = true;
        this.soundfontLoadingPromise = null;
        this.listeners.onStatusChange?.("SoundFont Ready");
      });
    }

    if (this.soundfontLoadingPromise) {
      await this.soundfontLoadingPromise;
    }
  }

  /**
   * Play a single interactive note preview (e.g. clicking piano keys)
   */
  public async playSingleNote(midiNote: number, volume: number = 80, isMuted: boolean = false): Promise<void> {
    try {
      await this.init();
      if (!this.soundfont || !this.audioCtx) return;

      const targetVol = isMuted ? 0 : volume / 100;
      this.soundfont.start({
        note: midiNote,
        velocity: Math.max(20, Math.floor(0.85 * 127 * targetVol)),
        duration: 0.6,
        time: this.audioCtx.currentTime,
      });
    } catch (err) {
      console.warn("StudioAudioEngine: Failed to play single note", err);
    }
  }

  /**
   * Schedules and plays an array of parsed MIDI notes with lookahead streaming
   */
  public async playNotes(options: PlayMidiOptions): Promise<void> {
    this.stop();

    try {
      await this.init();
      if (!this.soundfont || !this.audioCtx) {
        throw new Error("Audio Engine or SoundFont is not initialized");
      }

      this.isPlaying = true;
      const {
        notes,
        totalDuration,
        startFromTime = 0,
        speedMultiplier = 1.0,
        volume = 80,
        isMuted = false,
        enabledInstruments = { piano: true, bass: true, strings: true, drums: true },
        soloTrackIndex = "all",
      } = options;

      const targetVolume = isMuted ? 0 : volume / 100;
      const audioStartCtxTime = this.audioCtx.currentTime;
      const initialCurrentTime = startFromTime;
      let fallbackTs = 0;

      // Filter notes starting from startFromTime
      const playableNotes = notes
        .filter((n) => n.time >= startFromTime)
        .sort((a, b) => a.time - b.time);

      this.sortedNotes = playableNotes;
      this.nextScheduleIndex = 0;

      const scheduleAheadSec = 0.25;

      // 40ms High-Precision Lookahead Timer Loop
      this.playbackTimer = window.setInterval(() => {
        if (!this.isPlaying) return;

        let elapsedRealAudioSec = 0;
        if (this.audioCtx) {
          elapsedRealAudioSec = this.audioCtx.currentTime - audioStartCtxTime;
        } else {
          if (!fallbackTs) fallbackTs = Date.now();
          elapsedRealAudioSec = (Date.now() - fallbackTs) / 1000;
        }

        const currentElapsedTrackSec = initialCurrentTime + elapsedRealAudioSec * speedMultiplier;
        const boundedCurrentTime = Math.min(totalDuration, currentElapsedTrackSec);

        // Schedule notes in lookahead window
        if (this.audioCtx && this.soundfont) {
          const windowEndTrackSec = currentElapsedTrackSec + scheduleAheadSec * speedMultiplier;
          let idx = this.nextScheduleIndex;

          while (idx < this.sortedNotes.length) {
            const n = this.sortedNotes[idx];
            if (n.time > windowEndTrackSec) break;

            if (n.time >= currentElapsedTrackSec - 0.05 * speedMultiplier) {
              if (soloTrackIndex !== "all" || enabledInstruments[n.instType]) {
                const timeUntilNoteAudioSec = Math.max(0, (n.time - currentElapsedTrackSec) / speedMultiplier);
                const noteCtxTime = this.audioCtx.currentTime + timeUntilNoteAudioSec;

                this.soundfont.start({
                  note: n.midi,
                  velocity: Math.floor(n.velocity * 127 * targetVolume),
                  duration: Math.max(0.05, n.duration / speedMultiplier),
                  time: noteCtxTime,
                });
              }
            }
            idx++;
          }
          this.nextScheduleIndex = idx;
        }

        // Detect currently sounding active note for visualizer
        let activeNote: number | null = null;
        for (let i = 0; i < this.sortedNotes.length; i++) {
          const n = this.sortedNotes[i];
          if (n.time <= currentElapsedTrackSec && currentElapsedTrackSec <= n.time + n.duration) {
            if (soloTrackIndex !== "all" || enabledInstruments[n.instType]) {
              activeNote = n.midi;
            }
          } else if (n.time > currentElapsedTrackSec + 0.2 * speedMultiplier) {
            break;
          }
        }

        this.listeners.onTick?.(boundedCurrentTime, activeNote);
      }, 40);

      // Track completion timer
      const totalRemainingAudioMs = Math.max(
        0,
        ((totalDuration - startFromTime) / speedMultiplier) * 1000
      );

      this.endTimeoutId = window.setTimeout(() => {
        this.stop();
        this.listeners.onTrackEnded?.();
      }, totalRemainingAudioMs);
    } catch (err) {
      this.stop();
      this.listeners.onError?.(err as Error);
    }
  }

  /**
   * Stops playback and clears scheduled events without destroying audio context
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.endTimeoutId !== null) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }
    this.sortedNotes = [];
    this.nextScheduleIndex = 0;

    if (this.soundfont) {
      this.soundfont.stop();
    }
  }

  /**
   * Pauses audio context if running
   */
  public pause(): void {
    this.stop();
    if (this.audioCtx && this.audioCtx.state === "running") {
      this.audioCtx.suspend().catch(() => {});
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
