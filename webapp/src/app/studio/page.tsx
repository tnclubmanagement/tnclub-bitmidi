"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Spin, ConfigProvider, message } from "antd";
import { TrackRecord } from "@/lib/sqlWorker";
import { getMidiUrl } from "@/lib/midiLoader";
import { getStudioPlaylist, saveStudioPlaylist } from "./_lib/studioStorage";
import { DEFAULT_PRESETS } from "./_lib/studioConstants";
import { getAntdTheme } from "./_lib/studioTheme";
import MultiModeVisualizerModal from "./_components/MultiModeVisualizerModal";
import FooterPlayer from "./_components/FooterPlayer";
import TrackListView from "./_components/TrackListView";
import StudioHeader from "./_components/StudioHeader";
import StudioToolbar from "./_components/StudioToolbar";
import AlphaFilterBar from "./_components/AlphaFilterBar";
import PlaylistDrawer from "./_components/PlaylistDrawer";
import { AppSettingsProvider, useAppSettings } from "@/context/AppSettingsContext";
import { useStudioTracks } from "./_hooks/useStudioTracks";
import { useTrackFilters } from "./_hooks/useTrackFilters";
import { useStudioAudioPlayer } from "./_hooks/useStudioAudioPlayer";
import styles from "../app.module.css";

function MainStudioContent() {
  const { themeMode } = useAppSettings();

  // Playlist state (SSR Hydration Safe)
  const [playlist, setPlaylist] = useState<TrackRecord[]>(DEFAULT_PRESETS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaylist(getStudioPlaylist(DEFAULT_PRESETS));
  }, []);

  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);

  // Multi-Mode Stage Visualizer Modal State
  const [stageTrack, setStageTrack] = useState<TrackRecord | null>(null);
  const [isStageOpen, setIsStageOpen] = useState<boolean>(false);

  // Custom Hooks for Data, Filter & Audio Playback
  const { tracks, loading, searchQuery, handleSearch } = useStudioTracks();

  const {
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
  } = useTrackFilters({ tracks, playlist });

  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    activeMidiNote,
    currentTime,
    totalDuration,
    volume,
    isMuted,
    loopMode,
    handleVolumeChange,
    handleMutedChange,
    handleLoopModeChange,
    pausePlayback,
    playTrack,
    togglePlay,
    handleSeek,
    formatTime,
  } = useStudioAudioPlayer({
    playlist,
    tracks,
    enabledInstruments,
  });

  // Playlist management
  const savePlaylistToStorage = useCallback((newPlaylist: TrackRecord[]) => {
    setPlaylist(newPlaylist);
    saveStudioPlaylist(newPlaylist);
  }, []);

  const togglePlaylistTrack = useCallback(
    (e: React.MouseEvent, track: TrackRecord) => {
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
    },
    [playlist, savePlaylistToStorage]
  );

  const removeFromPlaylist = useCallback(
    (trackId: string) => {
      const updated = playlist.filter((t) => t.id !== trackId);
      savePlaylistToStorage(updated);
    },
    [playlist, savePlaylistToStorage]
  );

  const downloadMidiFile = useCallback((e: React.MouseEvent, track: TrackRecord) => {
    e.stopPropagation();
    const url = getMidiUrl(track.file_path);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${track.artist} - ${track.title}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <ConfigProvider theme={getAntdTheme(themeMode)}>
      <div className={`${styles.appContainer} ${styles[`theme_${themeMode}`] || ""}`}>
        {/* Header with Compact Shard Select & Playlist Counter */}
        <StudioHeader
          playlistCount={playlist.length}
          onOpenPlaylist={() => setIsPlaylistOpen(true)}
        />

        {/* Main Content Layout - 100% Full Width */}
        <div className={styles.mainLayout}>
          <main className={styles.contentArea}>
            {/* Clean & Streamlined Toolbar Header Bar */}
            <StudioToolbar
              totalTracksCount={processedTracks.length}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              selectedGenre={selectedGenre}
              onGenreChange={handleGenreChange}
              selectedInstrument={selectedInstrument}
              onInstrumentChange={handleInstrumentChange}
              selectedCountry={selectedCountry}
              onCountryChange={handleCountryChange}
              showFavoritesOnly={showFavoritesOnly}
              onToggleFavorites={handleFavsOnlyToggle}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            {/* A-Z Quick Filter Bar */}
            <AlphaFilterBar selectedAlpha={selectedAlpha} onAlphaChange={handleAlphaChange} />

            {/* Modular Track List View Component (Table / Grid / Compact / Vinyl) */}
            {loading ? (
              <div
                className={styles.tableContainer}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
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
        <PlaylistDrawer
          open={isPlaylistOpen}
          onClose={() => setIsPlaylistOpen(false)}
          playlist={playlist}
          onPlayTrack={playTrack}
          onRemoveTrack={removeFromPlaylist}
          onResetPreset={() => savePlaylistToStorage(DEFAULT_PRESETS)}
        />

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
          setLoopMode={handleLoopModeChange}
          setIsMuted={handleMutedChange}
          setVolume={handleVolumeChange}
          onSeek={handleSeek}
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
          onClose={() => {
            setIsStageOpen(false);
            if (isPlaying) {
              pausePlayback();
              setIsPlaying(false);
            }
          }}
          track={stageTrack || currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          activeMidiNote={activeMidiNote}
          enabledInstruments={enabledInstruments}
          setEnabledInstruments={updateEnabledInstruments}
          togglePlay={togglePlay}
          playTrack={playTrack}
          getMidiUrl={getMidiUrl}
          onSeek={handleSeek}
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
