# Implementation Plan: Group Band Jam (Ensemble MIDI Session)

We will introduce a **Group Band Jam (Ensemble Mode)** to the MIDI Studio. This feature allows multiple users (or multiple browser tabs) to create or join a real-time Room, select a MIDI song, assign individual instrument tracks to band members (e.g. Piano 🎹, Bass 🎸, Drums 🥁, Strings 🎻), and play along together with real-time synchronized playback and visual feedback!

---

## User Review Required

> [!IMPORTANT]
> **Real-Time Communication Strategy**:
> - We will use `BroadcastChannel` for instant local/multi-tab testing, combined with `PeerJS` (WebRTC) for multi-device cross-network jamming without requiring any backend server deployment.
> - When a user creates a Room (e.g. `JAM-7821`), they can share the Room ID or join link.

---

## Proposed Changes

### Component 1: Real-time Jam Room Architecture & Peer Signaling

#### [NEW] [`src/lib/jamSessionManager.ts`](file:///Users/ngominhtri/training/tnclub-bitmidi/webapp/src/lib/jamSessionManager.ts)
- Manages Room State (Room ID, Host ID, Members, Track Assignments, Playback State).
- Synchronizes playback timing (Play, Pause, Seek, BPM) across band members.
- Broadcasts real-time note triggers and emoji reactions (`🔥`, `🎸`, `🎹`, `👏`).

---

### Component 2: Band Jam Stage & Track Assignment Interface

#### [NEW] [`src/components/BandJamModal.tsx`](file:///Users/ngominhtri/training/tnclub-bitmidi/webapp/src/components/BandJamModal.tsx)
- **Glassmorphic Band Stage UI**: Displays active song details and a futuristic live stage layout.
- **Instrument Slots**: Displays all MIDI tracks parsed from the song (Piano, Drums, Bass, Lead, etc.).
- **Role Selection**: Allows players to "Claim Instrument", "Switch Instrument", or "Mute/Solo Track".
- **Interactive Player Deck**:
  - **Drums**: Tappable 4-pad drum kit mapped to drum MIDI notes.
  - **Piano/Synth**: Interactive 2-octave piano keyboard.
  - **Bass/Strings**: Dynamic note visualizer with pitch meter.
- **Live Sync & Stage Controls**: Play/Pause sync, Tempo control, Master Volume, Member Avatars with active volume visualizers.
- **Live Emoji Reactions**: Quick chat bar allowing band members to drop visual emojis floating up the stage.

---

### Component 3: Integration into Studio & Main Header

#### [MODIFY] [`src/app/studio/page.tsx`](file:///Users/ngominhtri/training/tnclub-bitmidi/webapp/src/app/studio/page.tsx)
- Add a prominent **"Tạo Group Chơi Jam 🎸" (Create Band Group)** button in the top action toolbar and track item action bar.
- Add support for URL query parameters (e.g. `?room=JAM-1234`) to automatically open the Band Jam session on join link.

#### [MODIFY] [`src/locales/dictionary.ts`](file:///Users/ngominhtri/training/tnclub-bitmidi/webapp/src/locales/dictionary.ts)
- Add multilingual translations (English & Vietnamese) for all Group Jam features, instrument slots, member roles, and sync controls.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify standard build integrity and TypeScript type checking.
- Run `eslint --fix` to ensure zero lint errors.

### Manual Verification
- Open two browser tabs or windows side by side.
- Create a Group Jam Room in Tab 1, copy the Room ID or Join Link into Tab 2.
- In Tab 1, assign "Drums 🥁"; in Tab 2, assign "Piano 🎹".
- Click "Play" in Tab 1 -> verify both tabs start audio synchronously, notes light up on respective instrument decks, and emoji reactions appear across both tabs.
