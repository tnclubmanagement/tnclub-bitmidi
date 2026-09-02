import { ProcessedFallingNote, INSTRUMENT_PALETTE } from "./types";
import { MidiDataProcessor } from "./MidiDataProcessor";

function drawLedgerLines(ctx: CanvasRenderingContext2D, noteX: number, startY: number, endY: number, step: number) {
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  const isUp = endY < startY;
  for (let ly = startY + (isUp ? -step : step); isUp ? ly >= endY : ly <= endY; ly += isUp ? -step : step) {
    ctx.beginPath();
    ctx.moveTo(noteX - 9, ly);
    ctx.lineTo(noteX + 9, ly);
    ctx.stroke();
  }
}

function drawStaffGrid(ctx: CanvasRenderingContext2D, trebleY: number, bassY: number, staffWidth: number) {
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(70, trebleY + i * 10);
    ctx.lineTo(70 + staffWidth, trebleY + i * 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(70, bassY + i * 10);
    ctx.lineTo(70 + staffWidth, bassY + i * 10);
    ctx.stroke();
  }

  // Left Bracket Bar Line
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(70, trebleY);
  ctx.lineTo(70, bassY + 40);
  ctx.stroke();

  // Measure Dividers (4 measures)
  const measWidth = staffWidth / 4;
  ctx.lineWidth = 1.2;
  for (let m = 1; m <= 4; m++) {
    const bx = 70 + m * measWidth;
    ctx.beginPath();
    ctx.moveTo(bx, trebleY);
    ctx.lineTo(bx, trebleY + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx, bassY);
    ctx.lineTo(bx, bassY + 40);
    ctx.stroke();
  }
}

function drawClefsAndTimeSignature(ctx: CanvasRenderingContext2D, trebleY: number, bassY: number) {
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 26px serif";
  ctx.textAlign = "center";
  ctx.fillText("𝄞", 88, trebleY + 20);
  ctx.fillText("𝄢", 88, bassY + 20);

  ctx.font = "bold 16px serif";
  ctx.fillText("4", 112, trebleY + 10);
  ctx.fillText("4", 112, trebleY + 30);
  ctx.fillText("4", 112, bassY + 10);
  ctx.fillText("4", 112, bassY + 30);
}

function drawStaffChordNotes(
  ctx: CanvasRenderingContext2D,
  chordNotes: Array<{ midi: number; _instType?: string }>,
  baseStaffY: number,
  noteX: number,
  isTrebleClef: boolean,
  isActiveChord: boolean
) {
  if (chordNotes.length === 0) return;

  const yPositions: number[] = [];
  chordNotes.forEach((n) => {
    const semitoneOffset = isTrebleClef ? n.midi - 60 : n.midi - 48;
    const staffStepY = baseStaffY + 40 - semitoneOffset * 3.5;
    yPositions.push(staffStepY);

    const palette = INSTRUMENT_PALETTE[n._instType || "piano"] || INSTRUMENT_PALETTE.piano;

    ctx.fillStyle = isActiveChord ? "#38bdf8" : palette.noteColor;
    ctx.beginPath();
    ctx.ellipse(noteX, staffStepY, 5.5, 4, -0.2, 0, 2 * Math.PI);
    ctx.fill();

    if (staffStepY < baseStaffY) {
      drawLedgerLines(ctx, noteX, baseStaffY - 10, staffStepY, 10);
    } else if (staffStepY > baseStaffY + 40) {
      drawLedgerLines(ctx, noteX, baseStaffY + 50, staffStepY, 10);
    }
  });

  if (yPositions.length > 0) {
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);
    ctx.strokeStyle = isActiveChord ? "#0284c7" : "#0f172a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(noteX + 5, maxY);
    ctx.lineTo(noteX + 5, minY - 20);
    ctx.stroke();
  }
}

export class CanvasPainter {
  static drawSheetHeader(ctx: CanvasRenderingContext2D, width: number, title: string, artist: string) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, 540);

    ctx.fillStyle = "#0f172a";
    ctx.font = 'bold 22px "Playfair Display", "Georgia", "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.fillText(title || "Piano Sheet Music", width / 2, 45);

    ctx.font = 'italic 13px "Georgia", serif';
    ctx.fillStyle = "#64748b";
    ctx.fillText(`Composer: ${artist || "TN Web MIDI Studio"} — Interactive Staff Score (A4)`, width / 2, 70);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 85);
    ctx.lineTo(width - 60, 85);
    ctx.stroke();
  }

  static drawGrandStaffSystem(
    ctx: CanvasRenderingContext2D,
    startY: number,
    systemIndex: number,
    width: number,
    rawNotes: Array<{ time: number; midi: number; _instType?: string }>,
    currentTime: number,
    isPlaying: boolean
  ) {
    const trebleY = startY;
    const bassY = startY + 80;
    const staffWidth = width - 140;

    // Draw Staff Grid Lines & Measure Dividers
    drawStaffGrid(ctx, trebleY, bassY, staffWidth);

    // Draw Clef & Time Signatures
    drawClefsAndTimeSignature(ctx, trebleY, bassY);

    // Get System Window Chords via Data Processor Class
    const { chordMap, startSec, systemWindowSec } = MidiDataProcessor.getSystemChords(rawNotes, currentTime, systemIndex);

    // Draw Treble & Bass Clef Chords
    chordMap.forEach((chordNotes, timeKey) => {
      const noteX = 130 + ((timeKey - startSec) / systemWindowSec) * (staffWidth - 80);
      if (noteX <= 120 || noteX >= 70 + staffWidth) return;

      const isActiveChord = isPlaying && Math.abs(currentTime - timeKey) < 0.2;
      const trebleNotes = chordNotes.filter((n) => n.midi >= 60);
      const bassNotes = chordNotes.filter((n) => n.midi < 60);

      drawStaffChordNotes(ctx, trebleNotes, trebleY, noteX, true, isActiveChord);
      drawStaffChordNotes(ctx, bassNotes, bassY, noteX, false, isActiveChord);
    });
  }

  static drawFallingNotesBackground(ctx: CanvasRenderingContext2D, width: number, height: number, hitY: number) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#080d1a");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle lane dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    const keyWidth = width / 88;
    for (let i = 0; i < 88; i++) {
      const x = i * keyWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hitY);
      ctx.stroke();
    }

    // Glowing Neon Hit Line
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(width, hitY);
    ctx.stroke();

    // Bottom Piano Keyboard Bar background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, hitY, width, height - hitY);
  }

  static drawFallingNotes(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    notes: ProcessedFallingNote[],
    currentTime: number,
    speed: number = 140
  ) {
    const hitY = height - 42;
    CanvasPainter.drawFallingNotesBackground(ctx, width, height, hitY);

    const keyWidth = width / 88;
    const activeKeys = new Map<number, string>();

    // High performance O(log N) slice of currently visible notes window
    const minTime = Math.max(0, currentTime - 3);
    const maxTime = currentTime + (hitY / speed) + 0.5;

    const startIndex = MidiDataProcessor.findFirstVisibleIndex(notes, minTime);

    for (let i = startIndex; i < notes.length; i++) {
      const n = notes[i];
      if (n.time > maxTime) break;

      const noteX = ((n.midi - 21) / 88) * width;
      const headY = hitY - (n.time - currentTime) * speed;
      const noteHeight = n.isDrum ? 10 : Math.min(220, Math.max(14, n.duration * speed));
      const topY = headY - noteHeight;

      // Only draw notes visible on stage
      if (topY < height && headY > 0) {
        const isHit = currentTime >= n.time - 0.05 && currentTime <= n.time + n.duration + 0.05;
        if (isHit) {
          activeKeys.set(n.midi, n.hitFill);
        }

        ctx.fillStyle = isHit ? n.hitFill : n.normalFill;
        ctx.beginPath();
        ctx.roundRect(noteX + 1, topY, Math.max(4, keyWidth - 2), noteHeight, 4);
        ctx.fill();

        ctx.strokeStyle = n.stroke;
        ctx.lineWidth = isHit ? 1.5 : 0.8;
        ctx.stroke();
      }
    }

    // Draw interactive bottom keyboard with active key illumination
    CanvasPainter.drawKeyboard(ctx, width, height, hitY, activeKeys);
  }

  static drawKeyboard(ctx: CanvasRenderingContext2D, width: number, height: number, hitY: number, activeKeys: Map<number, string>) {
    const keyWidth = width / 88;
    const kbHeight = height - hitY;

    for (let midi = 21; midi <= 108; midi++) {
      const idx = midi - 21;
      const x = idx * keyWidth;
      const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
      const activeColor = activeKeys.get(midi);

      if (activeColor) {
        ctx.fillStyle = activeColor;
        ctx.fillRect(x, hitY + 2, keyWidth - 1, kbHeight - 4);
      } else {
        ctx.fillStyle = isBlack ? "#1e293b" : "#334155";
        ctx.fillRect(x, hitY + 2, keyWidth - 1, isBlack ? kbHeight * 0.65 : kbHeight - 4);
      }
    }
  }
}
