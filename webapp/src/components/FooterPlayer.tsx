"use client";

import React from "react";
import { Button, Tooltip, Slider } from "antd";
import {
  SoundOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  RedoOutlined,
  MutedOutlined,
  UnorderedListOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { TrackRecord } from "@/lib/sqlWorker";
import { useAppSettings } from "@/context/AppSettingsContext";
import styles from "@/app/app.module.css";

type FooterPlayerProps = {
  currentTrack: TrackRecord | null;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  volume: number;
  isMuted: boolean;
  loopMode: "off" | "one";
  playlistLength: number;
  togglePlay: () => void;
  setLoopMode: (mode: "off" | "one") => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (vol: number) => void;
  onOpenPlaylist: () => void;
  onOpenStage: () => void;
  formatTime: (sec: number) => string;
};

export default function FooterPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  totalDuration,
  volume,
  isMuted,
  loopMode,
  playlistLength,
  togglePlay,
  setLoopMode,
  setIsMuted,
  setVolume,
  onOpenPlaylist,
  onOpenStage,
  formatTime,
}: FooterPlayerProps) {
  const { t } = useAppSettings();

  return (
    <footer className={styles.footerPlayer}>
      <div className={styles.playingInfo}>
        <SoundOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
            {currentTrack ? currentTrack.title : t.noTrackSelected}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            {currentTrack ? currentTrack.artist : t.selectTrackToStart}
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
        <Tooltip title={t.openStageVisualizer}>
          <Button
            type="default"
            icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
            disabled={!currentTrack}
            onClick={onOpenStage}
          >
            {t.stageMode}
          </Button>
        </Tooltip>

        <Button
          type="primary"
          ghost
          size="small"
          icon={<UnorderedListOutlined />}
          onClick={onOpenPlaylist}
        >
          {t.myPlaylist} ({playlistLength})
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
  );
}
