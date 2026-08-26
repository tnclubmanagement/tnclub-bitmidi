"use client";

import React from "react";
import { Button, Tooltip } from "antd";
import {
  PlayCircleFilled,
  PauseCircleFilled,
  HeartOutlined,
  HeartFilled,
  DownloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { TrackRecord } from "@/lib/sqlWorker";
import { useAppSettings } from "@/context/AppSettingsContext";
import styles from "@/app/app.module.css";

export type ViewMode = "table" | "grid" | "compact" | "vinyl";

export type TrackItemProps = {
  index: number;
  track: TrackRecord;
  isSelected: boolean;
  isPlaying: boolean;
  inPlaylist: boolean;
  searchQuery?: string;
  playTrack: (track: TrackRecord) => void;
  togglePlay: () => void;
  togglePlaylistTrack: (e: React.MouseEvent, track: TrackRecord) => void;
  downloadMidiFile: (e: React.MouseEvent, track: TrackRecord) => void;
  onOpenStage: (track: TrackRecord) => void;
};

function highlightText(text: string, query?: string) {
  if (!query || !query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ backgroundColor: "#38bdf8", color: "#030712", padding: "0 2px", borderRadius: 3, fontWeight: 700 }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function EqualizerWave() {
  return (
    <div className={styles.equalizerWave} title="Playing Audio">
      <span className={styles.equalizerBar}></span>
      <span className={styles.equalizerBar}></span>
      <span className={styles.equalizerBar}></span>
      <span className={styles.equalizerBar}></span>
    </div>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// 1. Table Row Strategy
function TableRowItem({ index, track, isSelected, isPlaying, inPlaylist, searchQuery, playTrack, togglePlaylistTrack, downloadMidiFile, onOpenStage }: TrackItemProps) {
  const { t } = useAppSettings();
  return (
    <div
      className={`${styles.tableRow} ${isSelected ? styles.tableRowActive : ""}`}
      onClick={() => playTrack(track)}
    >
      <div className={styles.colNo}>{isSelected && isPlaying ? <EqualizerWave /> : `#${index + 1}`}</div>
      <div className={styles.colTitle}>{highlightText(track.title, searchQuery)}</div>
      <div className={styles.colArtist}>{highlightText(track.artist, searchQuery)}</div>
      <div className={styles.colDuration}>
        <ClockCircleOutlined /> {formatDuration(track.duration)}
      </div>
      <div className={styles.colAction}>
        <Tooltip title={t.openStageVisualizer}>
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
            onClick={(e) => {
              e.stopPropagation();
              onOpenStage(track);
            }}
          />
        </Tooltip>
        <Tooltip title={inPlaylist ? t.removeFromPlaylist : t.addToPlaylist}>
          <Button
            type="text"
            icon={inPlaylist ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined style={{ color: "#94a3b8" }} />}
            onClick={(e) => togglePlaylistTrack(e, track)}
          />
        </Tooltip>
        <Tooltip title={t.downloadMidi}>
          <Button
            type="text"
            icon={<DownloadOutlined style={{ color: "#94a3b8" }} />}
            onClick={(e) => downloadMidiFile(e, track)}
          />
        </Tooltip>
      </div>
    </div>
  );
}

// 2. Compact Row Strategy
function CompactRowItem({ index, track, isSelected, isPlaying, inPlaylist, playTrack, togglePlay, togglePlaylistTrack, onOpenStage }: TrackItemProps) {
  return (
    <div
      className={`${styles.compactRow} ${isSelected ? styles.compactRowActive : ""}`}
      onClick={() => playTrack(track)}
    >
      <div style={{ width: 45, fontWeight: 700, color: "#64748b" }}>
        {isSelected && isPlaying ? <EqualizerWave /> : `#${index + 1}`}
      </div>
      <div style={{ flex: 2, fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {track.title}
      </div>
      <div style={{ flex: 1.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {track.artist}
      </div>
      <div style={{ width: 120, display: "flex", justifyContent: "flex-end", gap: 4 }}>
        <Tooltip title="Open Stage Visualizer">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
            onClick={(e) => {
              e.stopPropagation();
              onOpenStage(track);
            }}
          />
        </Tooltip>
        <Tooltip title={inPlaylist ? "Remove" : "Add"}>
          <Button
            type="text"
            size="small"
            icon={inPlaylist ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined style={{ color: "#94a3b8" }} />}
            onClick={(e) => togglePlaylistTrack(e, track)}
          />
        </Tooltip>
        <Button
          type="text"
          size="small"
          icon={isSelected && isPlaying ? <PauseCircleFilled style={{ color: "#38bdf8" }} /> : <PlayCircleFilled />}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) togglePlay();
            else playTrack(track);
          }}
        />
      </div>
    </div>
  );
}

// 3. Grid Card Strategy
function GridCardItem({ index, track, isSelected, isPlaying, inPlaylist, playTrack, togglePlay, togglePlaylistTrack, downloadMidiFile, onOpenStage }: TrackItemProps) {
  return (
    <div
      className={`${styles.gridCard} ${isSelected ? styles.gridCardActive : ""}`}
      onClick={() => playTrack(track)}
    >
      <div className={styles.cardHeaderRow}>
        <span className={styles.cardNumberBadge}>
          {isSelected && isPlaying ? <EqualizerWave /> : `No. #${index + 1}`}
        </span>
        <span className={styles.formatBadge}>MIDI (.mid)</span>
      </div>
      <div className={styles.gridCardTitle}>{track.title}</div>
      <div className={styles.gridCardArtist}>{track.artist}</div>

      <div className={styles.cardMetaRow}>
        <span><ClockCircleOutlined /> {formatDuration(track.duration)}</span>
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
            if (isSelected) togglePlay();
            else playTrack(track);
          }}
        />

        <div>
          <Tooltip title="Open Stage Visualizer">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
              onClick={(e) => {
                e.stopPropagation();
                onOpenStage(track);
              }}
            />
          </Tooltip>
          <Tooltip title={inPlaylist ? "Remove from Playlist" : "Add to Playlist"}>
            <Button
              type="text"
              icon={inPlaylist ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined style={{ color: "#94a3b8" }} />}
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
}

// 4. Vinyl Card Strategy
function VinylCardItem({ track, isSelected, isPlaying, inPlaylist, playTrack, togglePlay, togglePlaylistTrack, onOpenStage }: TrackItemProps) {
  return (
    <div
      className={`${styles.vinylCard} ${isSelected ? styles.gridCardActive : ""}`}
      onClick={() => playTrack(track)}
    >
      <div className={styles.vinylWrapper}>
        <div className={styles.vinylSleeve}>
          <CustomerServiceOutlined style={{ fontSize: 24, color: "#38bdf8", marginBottom: 4 }} />
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
            {track.title}
          </div>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
            {track.artist}
          </div>
        </div>
        <div className={styles.vinylDiscContainer}>
          <div className={`${styles.vinylDisc} ${isSelected && isPlaying ? styles.vinylDiscSpin : ""}`}>
            <div className={styles.vinylCenterLabel}>
              {isSelected && isPlaying ? <EqualizerWave /> : "MIDI"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4 }}>
        {track.title}
      </div>
      <div style={{ fontSize: "0.82rem", color: "#94a3b8", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {track.artist}
      </div>

      <div className={styles.gridCardFooter} style={{ width: "100%" }}>
        <Button
          type="primary"
          shape="circle"
          size="small"
          icon={isSelected && isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelected) togglePlay();
            else playTrack(track);
          }}
        />
        <div>
          <Tooltip title="Open Stage Visualizer">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
              onClick={(e) => {
                e.stopPropagation();
                onOpenStage(track);
              }}
            />
          </Tooltip>
          <Tooltip title={inPlaylist ? "Remove" : "Add"}>
            <Button
              type="text"
              icon={inPlaylist ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined style={{ color: "#94a3b8" }} />}
              onClick={(e) => togglePlaylistTrack(e, track)}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// 🎯 Layout Strategy Component Registry Pattern Definition
type LayoutStrategyConfig = {
  isGrid: boolean;
  component: React.ComponentType<TrackItemProps>;
};

const VIEW_STRATEGIES: Record<ViewMode, LayoutStrategyConfig> = {
  table: { isGrid: false, component: TableRowItem },
  compact: { isGrid: false, component: CompactRowItem },
  grid: { isGrid: true, component: GridCardItem },
  vinyl: { isGrid: true, component: VinylCardItem },
};

type TrackListViewProps = {
  viewMode: ViewMode;
  tracks: TrackRecord[];
  currentTrack: TrackRecord | null;
  isPlaying: boolean;
  playlist: TrackRecord[];
  searchQuery?: string;
  playTrack: (track: TrackRecord) => void;
  togglePlay: () => void;
  togglePlaylistTrack: (e: React.MouseEvent, track: TrackRecord) => void;
  downloadMidiFile: (e: React.MouseEvent, track: TrackRecord) => void;
  onOpenStage: (track: TrackRecord) => void;
};

export default function TrackListView({
  viewMode,
  tracks,
  currentTrack,
  isPlaying,
  playlist,
  searchQuery,
  playTrack,
  togglePlay,
  togglePlaylistTrack,
  downloadMidiFile,
  onOpenStage,
}: TrackListViewProps) {
  // Retrieve strategy from Registry Pattern (O(1) Lookup)
  const strategy = VIEW_STRATEGIES[viewMode] || VIEW_STRATEGIES.table;
  const ItemComponent = strategy.component;

  const renderItem = (index: number) => {
    const track = tracks[index];
    const isSelected = currentTrack?.id === track.id;
    const inPlaylist = playlist.some((t) => t.id === track.id);

    return (
      <ItemComponent
        key={track.id || index}
        index={index}
        track={track}
        isSelected={isSelected}
        isPlaying={isPlaying}
        inPlaylist={inPlaylist}
        searchQuery={searchQuery}
        playTrack={playTrack}
        togglePlay={togglePlay}
        togglePlaylistTrack={togglePlaylistTrack}
        downloadMidiFile={downloadMidiFile}
        onOpenStage={onOpenStage}
      />
    );
  };

  if (strategy.isGrid) {
    return (
      <div className={styles.gridContainerWrapper}>
        <VirtuosoGrid
          style={{ height: "100%", width: "100%" }}
          totalCount={tracks.length}
          listClassName={styles.gridListContainer}
          itemClassName={styles.gridItemWrapper}
          itemContent={renderItem}
        />
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <Virtuoso
        style={{ height: "100%", width: "100%" }}
        totalCount={tracks.length}
        itemContent={renderItem}
      />
    </div>
  );
}
