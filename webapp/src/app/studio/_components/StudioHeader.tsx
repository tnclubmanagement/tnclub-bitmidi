"use client";

import React from "react";
import { Badge, Button, Select, Popover } from "antd";
import {
  CustomerServiceOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useAppSettings, ThemeMode, Language } from "@/context/AppSettingsContext";
import styles from "@/app/app.module.css";

interface StudioHeaderProps {
  playlistCount: number;
  onOpenPlaylist: () => void;
}

export default function StudioHeader({ playlistCount, onOpenPlaylist }: StudioHeaderProps) {
  const { themeMode, setThemeMode, language, setLanguage, t } = useAppSettings();

  return (
    <header className={styles.header}>
      <div className={styles.logoGroup}>
        <CustomerServiceOutlined style={{ fontSize: 28, color: "#38bdf8" }} />
        <h1 className={styles.logoTitle}>TN Web MIDI Studio</h1>
      </div>

      <div className={styles.headerControls}>
        <Link href="/">
          <Button type="default" icon={<HomeOutlined style={{ color: "#38bdf8" }} />}>
            Trang Chủ AI Landing
          </Button>
        </Link>

        {/* Quick Settings Drawer / Modal Button */}
        <Popover
          content={
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220, padding: "6px 0" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                  {t.themeTitle}
                </div>
                <Select
                  value={themeMode}
                  style={{ width: "100%" }}
                  onChange={(val) => setThemeMode(val as ThemeMode)}
                  options={[
                    { value: "dark", label: "🌙 Dark Mode" },
                    { value: "light", label: "☀️ Light Mode" },
                    { value: "neon", label: "⚡ Neon Cyber" },
                    { value: "retro", label: "📻 Retro Gold" },
                  ]}
                />
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                  {t.langTitle}
                </div>
                <Select
                  value={language}
                  style={{ width: "100%" }}
                  onChange={(val) => setLanguage(val as Language)}
                  options={[
                    { value: "vi", label: "🇻🇳 Tiếng Việt" },
                    { value: "en", label: "🇺🇸 English" },
                    { value: "ja", label: "🇯🇵 日本語" },
                  ]}
                />
              </div>
            </div>
          }
          trigger="click"
          placement="bottomRight"
        >
          <Button icon={<SettingOutlined />} type="default">
            Settings
          </Button>
        </Popover>

        <Button
          type="primary"
          icon={<UnorderedListOutlined />}
          onClick={onOpenPlaylist}
          style={{ backgroundColor: "#0284c7" }}
        >
          {t.myPlaylist}{" "}
          <Badge
            count={playlistCount}
            overflowCount={99}
            style={{ backgroundColor: "#818cf8", marginLeft: 6 }}
          />
        </Button>
      </div>
    </header>
  );
}
