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
  ThunderboltOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Popover, InputNumber } from "antd";
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
  tempoBpm?: number;
  originalBpm?: number;
  playlistLength: number;
  togglePlay: () => void;
  setLoopMode: (mode: "off" | "one") => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (vol: number) => void;
  setTempoBpm?: (bpm: number) => void;
  onOpenPlaylist: () => void;
  onOpenStage: () => void;
  onSeek?: (newTime: number) => void;
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
  tempoBpm = 120,
  originalBpm = 120,
  playlistLength,
  togglePlay,
  setLoopMode,
  setIsMuted,
  setVolume,
  setTempoBpm,
  onOpenPlaylist,
  onOpenStage,
  onSeek,
  formatTime,
}: FooterPlayerProps) {
  const { t } = useAppSettings();

  return (
    <footer className={styles.footerPlayer}>
      <div className={styles.playingInfo}>
        {isPlaying ? (
          <div className={styles.equalizerWave} style={{ height: 24, gap: 4 }}>
            <span className={styles.equalizerBar} style={{ width: 4 }}></span>
            <span className={styles.equalizerBar} style={{ width: 4 }}></span>
            <span className={styles.equalizerBar} style={{ width: 4 }}></span>
            <span className={styles.equalizerBar} style={{ width: 4 }}></span>
          </div>
        ) : (
          <SoundOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
        )}
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
        <div className={styles.buttonRow} style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          {setTempoBpm && (
            <Popover
              trigger="click"
              placement="top"
              content={
                <div style={{ width: 220, padding: 6, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#94a3b8" }}>
                      TEMPO (BPM)
                    </span>
                    <InputNumber
                      size="small"
                      min={30}
                      max={280}
                      step={1}
                      value={tempoBpm}
                      onChange={(val) => val && setTempoBpm(Math.round(val))}
                      style={{ width: 70 }}
                    />
                  </div>

                  <Slider
                    min={30}
                    max={240}
                    step={1}
                    value={tempoBpm}
                    onChange={(val) => setTempoBpm(val)}
                    tooltip={{ formatter: (val) => `${val} BPM` }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => setTempoBpm(Math.max(30, tempoBpm - 5))}
                    >
                      -5
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setTempoBpm(originalBpm)}
                      style={{ fontSize: "0.75rem", flex: 1 }}
                    >
                      Reset ({originalBpm})
                    </Button>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setTempoBpm(Math.min(280, tempoBpm + 5))}
                    >
                      +5
                    </Button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[60, 80, 100, 120, 140, 160].map((bpm) => (
                      <Button
                        key={bpm}
                        size="small"
                        type={tempoBpm === bpm ? "primary" : "default"}
                        onClick={() => setTempoBpm(bpm)}
                        style={{ fontSize: "0.7rem", padding: "0 6px", height: 22 }}
                      >
                        {bpm}
                      </Button>
                    ))}
                  </div>
                </div>
              }
            >
              <Button
                size="small"
                icon={<ThunderboltOutlined style={{ color: "#eab308" }} />}
                style={{ fontSize: "0.8rem", fontWeight: 600 }}
              >
                {tempoBpm} BPM
              </Button>
            </Popover>
          )}
        </div>
        <div className={styles.seekRow}>
          <span className={styles.timeText}>{formatTime(currentTime)}</span>
          <Slider
            style={{ flex: 1, margin: 0 }}
            min={0}
            max={totalDuration || 100}
            value={currentTime}
            onChange={onSeek}
            tooltip={{ formatter: (val) => formatTime(val || 0) }}
            disabled={!currentTrack}
          />
          <span className={styles.timeText}>{formatTime(totalDuration)}</span>
        </div>
      </div>

      <div className={styles.audioControlsRight}>
        <Tooltip title={t.openStageVisualizer}>
          <Button
            id="footer-open-stage-btn"
            data-testid="footer-open-stage-btn"
            aria-label={t.openStageVisualizer}
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
