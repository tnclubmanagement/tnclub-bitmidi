"use client";

import React from "react";
import styles from "@/app/app.module.css";

interface VisualizerProps {
  activeNote?: number | null;
  onPlayNote?: (midiNote: number) => void;
}

export default function PianoRollVisualizer({ activeNote, onPlayNote }: VisualizerProps) {
  // 52 White Keys mapping
  // A0 (21) to C8 (108)
  const WHITE_KEYS = [
    21, 23, 24, 26, 28, 29, 31, 33, 35, 36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59,
    60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98,
    100, 101, 103, 105, 107, 108
  ];

  // Black keys mapping to their relative position index (after white key index)
  const BLACK_KEYS: { note: number; afterWhiteIndex: number }[] = [
    { note: 22, afterWhiteIndex: 0 },
    { note: 25, afterWhiteIndex: 2 },
    { note: 27, afterWhiteIndex: 3 },
    { note: 30, afterWhiteIndex: 5 },
    { note: 32, afterWhiteIndex: 6 },
    { note: 34, afterWhiteIndex: 7 },
    { note: 37, afterWhiteIndex: 9 },
    { note: 39, afterWhiteIndex: 10 },
    { note: 42, afterWhiteIndex: 12 },
    { note: 44, afterWhiteIndex: 13 },
    { note: 46, afterWhiteIndex: 14 },
    { note: 49, afterWhiteIndex: 16 },
    { note: 51, afterWhiteIndex: 17 },
    { note: 54, afterWhiteIndex: 19 },
    { note: 56, afterWhiteIndex: 20 },
    { note: 58, afterWhiteIndex: 21 },
    { note: 61, afterWhiteIndex: 23 },
    { note: 63, afterWhiteIndex: 24 },
    { note: 66, afterWhiteIndex: 26 },
    { note: 68, afterWhiteIndex: 27 },
    { note: 70, afterWhiteIndex: 28 },
    { note: 73, afterWhiteIndex: 30 },
    { note: 75, afterWhiteIndex: 31 },
    { note: 78, afterWhiteIndex: 33 },
    { note: 80, afterWhiteIndex: 34 },
    { note: 82, afterWhiteIndex: 35 },
    { note: 85, afterWhiteIndex: 37 },
    { note: 87, afterWhiteIndex: 38 },
    { note: 90, afterWhiteIndex: 40 },
    { note: 92, afterWhiteIndex: 41 },
    { note: 94, afterWhiteIndex: 42 },
    { note: 97, afterWhiteIndex: 44 },
    { note: 99, afterWhiteIndex: 45 },
    { note: 102, afterWhiteIndex: 47 },
    { note: 104, afterWhiteIndex: 48 },
    { note: 106, afterWhiteIndex: 49 },
  ];

  const getNoteName = (midi: number) => {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const name = names[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return `${name}${oct}`;
  };

  const handleKeyClick = (note: number) => {
    if (onPlayNote) {
      onPlayNote(note);
    }
  };

  return (
    <div
      className={styles.visualizerContainer}
      id="piano-roll-visualizer"
      data-testid="piano-roll-visualizer"
      role="region"
      aria-label="Interactive Piano Roll Keyboard"
    >
      <div className={styles.visualizerHeader} aria-label="Piano Visualizer Status Header">
        <span>🎹 Interactive SoundFont Piano Visualizer</span>
        <span
          id="piano-active-note-tag"
          data-testid="piano-active-note-tag"
          aria-label={activeNote ? `Currently active MIDI note: ${activeNote} (${getNoteName(activeNote)})` : "Click any key or play MIDI"}
          className={styles.visualizerActiveTag}
        >
          {activeNote ? `Playing MIDI Note: ${activeNote} (${getNoteName(activeNote)})` : "Click key or play audio"}
        </span>
      </div>

      <div
        className={styles.pianoKeyboard}
        id="piano-keyboard-keys"
        data-testid="piano-keyboard-keys"
        role="group"
        aria-label="Piano 52-key Keyboard"
      >
        {WHITE_KEYS.map((note) => (
          <div
            key={note}
            id={`piano-white-key-${note}`}
            data-testid={`piano-key-${note}`}
            data-note={note}
            data-active={activeNote === note}
            aria-label={`White Piano Key MIDI Note ${note}${activeNote === note ? " (Playing)" : ""}`}
            className={`${styles.whiteKey} ${activeNote === note ? styles.activeKey : ""}`}
            onClick={() => handleKeyClick(note)}
          />
        ))}

        {BLACK_KEYS.map(({ note, afterWhiteIndex }) => (
          <div
            key={note}
            id={`piano-black-key-${note}`}
            data-testid={`piano-key-${note}`}
            data-note={note}
            data-active={activeNote === note}
            aria-label={`Black Piano Key MIDI Note ${note}${activeNote === note ? " (Playing)" : ""}`}
            className={`${styles.blackKey} ${activeNote === note ? styles.activeKey : ""}`}
            style={{ left: `${((afterWhiteIndex + 1) * (100 / 52)) - (100 / 52 * 0.35)}%` }}
            onClick={() => handleKeyClick(note)}
          />
        ))}
      </div>
    </div>
  );
}
