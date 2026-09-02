"use client";

import React from "react";
import { Drawer, Button } from "antd";
import { HeartOutlined, DeleteOutlined } from "@ant-design/icons";
import { TrackRecord } from "@/lib/sqlWorker";
import styles from "@/app/app.module.css";

interface PlaylistDrawerProps {
  open: boolean;
  onClose: () => void;
  playlist: TrackRecord[];
  onPlayTrack: (track: TrackRecord) => void;
  onRemoveTrack: (trackId: string) => void;
  onResetPreset: () => void;
}

export default function PlaylistDrawer({
  open,
  onClose,
  playlist,
  onPlayTrack,
  onRemoveTrack,
  onResetPreset,
}: PlaylistDrawerProps) {
  return (
    <Drawer
      title={`My Favorite Playlist (${playlist.length} tracks)`}
      placement="right"
      onClose={onClose}
      open={open}
      style={{ width: 380, maxWidth: "100vw" }}
      styles={{ body: { padding: 16 } }}
      extra={
        <Button type="link" size="small" onClick={onResetPreset}>
          Reset to Preset
        </Button>
      }
    >
      {playlist.length === 0 ? (
        <div style={{ textAlign: "center", color: "#64748b", marginTop: 40 }}>
          <HeartOutlined style={{ fontSize: 36, marginBottom: 12 }} />
          <div>Your playlist is empty. Click the heart icon on any track to add it here.</div>
        </div>
      ) : (
        playlist.map((track, i) => (
          <div
            key={track.id}
            className={styles.playlistRowItem}
            onClick={() => {
              onPlayTrack(track);
              onClose();
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                {i + 1}. {track.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{track.artist}</div>
            </div>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTrack(track.id);
              }}
            />
          </div>
        ))
      )}
    </Drawer>
  );
}
