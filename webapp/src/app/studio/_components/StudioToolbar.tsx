"use client";

import React from "react";
import { Input, Badge, Button, Select, Segmented } from "antd";
import {
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  HeartOutlined,
  HeartFilled,
  CompassOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useAppSettings } from "@/context/AppSettingsContext";
import styles from "@/app/app.module.css";

interface StudioToolbarProps {
  totalTracksCount: number;
  searchQuery: string;
  onSearch: (value: string) => void;
  selectedGenre: string;
  onGenreChange: (val: string) => void;
  selectedInstrument: string;
  onInstrumentChange: (val: string) => void;
  selectedCountry: string;
  onCountryChange: (val: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  viewMode: "table" | "grid" | "compact" | "vinyl";
  onViewModeChange: (mode: "table" | "grid" | "compact" | "vinyl") => void;
}

export default function StudioToolbar({
  totalTracksCount,
  onSearch,
  selectedGenre,
  onGenreChange,
  selectedInstrument,
  onInstrumentChange,
  selectedCountry,
  onCountryChange,
  showFavoritesOnly,
  onToggleFavorites,
  viewMode,
  onViewModeChange,
}: StudioToolbarProps) {
  const { t } = useAppSettings();

  return (
    <div className={styles.tableHeaderBar}>
      <div className={styles.tableTitleInfo}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Library Tracks</h2>
        <Badge
          count={`${totalTracksCount} tracks`}
          overflowCount={99999}
          style={{ backgroundColor: "#0284c7" }}
        />
      </div>

      <div className={styles.toolbarRight}>
        <div className={styles.searchBox}>
          <Input
            placeholder={t.searchPlaceholder}
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <Select
          value={selectedGenre}
          style={{ width: 130 }}
          onChange={onGenreChange}
          options={[
            { value: "ALL", label: t.allGenres },
            { value: "Pop", label: t.pop },
            { value: "Rock", label: t.rock },
            { value: "Country", label: t.country },
            { value: "Jazz", label: t.jazz },
            { value: "Classical", label: t.classical },
            { value: "Electronic", label: t.electronic },
            { value: "Soundtrack", label: t.soundtrack },
          ]}
        />

        <Select
          value={selectedInstrument}
          style={{ width: 140 }}
          onChange={onInstrumentChange}
          options={[
            { value: "ALL", label: t.allInstruments },
            { value: "Piano", label: t.instPiano },
            { value: "Guitar", label: t.instGuitar },
            { value: "Bass", label: t.instBass },
            { value: "Strings", label: t.instStrings },
            { value: "Brass", label: t.instBrass },
            { value: "drums", label: t.instDrums },
            { value: "Synth", label: t.instSynth },
            { value: "Organ", label: t.instOrgan },
          ]}
        />

        <Select
          value={selectedCountry}
          style={{ width: 140 }}
          onChange={onCountryChange}
          options={[
            { value: "ALL", label: t.globalAll },
            { value: "US_EU", label: t.usEu },
            { value: "ASIA", label: t.asia },
          ]}
        />

        <Button
          type={showFavoritesOnly ? "primary" : "default"}
          danger={showFavoritesOnly}
          icon={showFavoritesOnly ? <HeartFilled /> : <HeartOutlined />}
          onClick={onToggleFavorites}
        >
          {showFavoritesOnly ? t.favoritesOnly : t.allTracks}
        </Button>

        <Segmented
          options={[
            { value: "table", icon: <BarsOutlined />, tooltip: t.tableMode },
            { value: "grid", icon: <AppstoreOutlined />, tooltip: t.gridMode },
            { value: "compact", icon: <MenuOutlined />, tooltip: t.compactMode },
            { value: "vinyl", icon: <CompassOutlined />, tooltip: t.vinylMode },
          ]}
          value={viewMode}
          onChange={(val) => onViewModeChange(val as "table" | "grid" | "compact" | "vinyl")}
        />
      </div>
    </div>
  );
}
