"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartFilled,
  CustomerServiceOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  GithubOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  FileZipOutlined,
  AudioOutlined,
  TagsOutlined,
  SearchOutlined,
  SettingOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Tag, Button, Input, Table, Card, Popover, Select, ConfigProvider, theme } from "antd";
import { AppSettingsProvider, useAppSettings, ThemeMode, Language } from "@/context/AppSettingsContext";
import styles from "../landing/landing.module.css";

interface CategoryStat {
  id: string;
  category: string;
  count: number;
  description: string;
  icon: string;
  color: string;
  sampleArtists: string;
}

function MainCreditsContent() {
  const { themeMode, setThemeMode, language, setLanguage, t } = useAppSettings();
  const [searchTerm, setSearchTerm] = useState("");

  const categories: CategoryStat[] = [
    {
      id: "cat_1",
      category: "Rock & Pop International",
      count: 6420,
      description: "Các bản MIDI Rock & Pop kinh điển thập niên 80s - 2000s từ các nhóm nhạc lừng danh.",
      icon: "🎸",
      color: "#0284c7",
      sampleArtists: "Queen, Oasis, Linkin Park, The Beatles, Michael Jackson",
    },
    {
      id: "cat_2",
      category: "Classical & Orchestra",
      count: 3150,
      description: "Tổng phổ hòa tấu giao hưởng, Sonate Piano cổ điển từ các nhà soạn nhạc vĩ đại.",
      icon: "🎻",
      color: "#be185d",
      sampleArtists: "L.V. Beethoven, W.A. Mozart, J.S. Bach, F. Chopin, Tchaikovsky",
    },
    {
      id: "cat_3",
      category: "Jazz, Blues & Soul",
      count: 2480,
      description: "Các ngón đàn ngẫu hứng Jazz Standard, Blues Walker và âm hưởng Soul quyến rũ.",
      icon: "🎷",
      color: "#d97706",
      sampleArtists: "Miles Davis, Duke Ellington, Bill Evans, Louis Armstrong",
    },
    {
      id: "cat_4",
      category: "Electronic, Dance & Synthwave",
      count: 2890,
      description: "Giai điệu Synth, Arpeggio sôi động cho nhạc Điện Tử, Eurodance và Cyberpunk 80s.",
      icon: "🎹",
      color: "#7e22ce",
      sampleArtists: "Daft Punk, Kraftwerk, Vangelis, Jean-Michel Jarre",
    },
    {
      id: "cat_5",
      category: "Movie & Gaming Soundtracks",
      count: 1810,
      description: "Nhạc phim điện ảnh bom tấn và Soundtracks các tựa game huyền thoại 8-bit / 16-bit.",
      icon: "🎮",
      color: "#10b981",
      sampleArtists: "Hans Zimmer, John Williams, Nobuo Uematsu (Final Fantasy), Koji Kondo (Mario)",
    },
    {
      id: "cat_6",
      category: "Traditional & Acoustic Heritage",
      count: 706,
      description: "Dân ca, nhạc Folk acoustic và giai điệu truyền thống chọn lọc.",
      icon: "🪕",
      color: "#f59e0b",
      sampleArtists: "Traditional Folk, Acoustic Ensembles, Fingerstyle Guitarists",
    },
  ];

  const filteredCategories = categories.filter(
    (c) =>
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sampleArtists.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLight = themeMode === "light";
  const textColorPrimary = isLight ? "#0f172a" : "#f8fafc";
  const textColorSecondary = isLight ? "#475569" : "#94a3b8";

  const columns = [
    {
      title: t.categoryColName,
      dataIndex: "category",
      key: "category",
      width: "45%",
      render: (text: string, record: CategoryStat) => (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: "1.8rem" }}>{record.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: textColorPrimary, fontSize: "1.05rem", marginBottom: 2 }}>{text}</div>
            <div style={{ fontSize: "0.85rem", color: textColorSecondary, lineHeight: 1.4 }}>{record.description}</div>
          </div>
        </div>
      ),
    },
    {
      title: t.sampleArtistsColName,
      dataIndex: "sampleArtists",
      key: "sampleArtists",
      width: "35%",
      render: (text: string) => (
        <span style={{ color: isLight ? "#0284c7" : "#38bdf8", fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.5, display: "inline-block" }}>{text}</span>
      ),
    },
    {
      title: t.trackCountColName,
      dataIndex: "count",
      key: "count",
      width: "20%",
      align: "right" as const,
      render: (count: number, record: CategoryStat) => (
        <Tag color={record.color} style={{ fontSize: "0.95rem", padding: "6px 14px", borderRadius: 8, fontWeight: 700, margin: 0 }}>
          {count.toLocaleString()} MIDI Tracks
        </Tag>
      ),
    },
  ];

  const themeClass = themeMode !== "dark" ? styles[`theme${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`] : "";

  return (
    <div className={`${styles.landingContainer} ${themeClass}`}>
      <div className={styles.bgGlowOrb1} />
      <div className={styles.bgGlowOrb2} />

      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <CustomerServiceOutlined style={{ fontSize: 30, color: "#38bdf8" }} />
          <Link id="credits-brand-link" href="/" style={{ color: "#f8fafc", textDecoration: "none" }}>
            TN MIDI AI Studio
          </Link>
        </div>
        <div className={styles.navLinks}>
          <Link id="credits-nav-home" href="/" className={styles.navLink}>
            {t.homeLink}
          </Link>
          <Link id="credits-nav-credits" href="/credits" className={styles.navLink} style={{ color: "#38bdf8", fontWeight: 700 }}>
            {t.credits}
          </Link>
          <Link id="credits-nav-api-docs" href="/api-docs" className={styles.navLink}>
            API Docs
          </Link>

          {/* Quick Settings Popover */}
          <Popover
            content={
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220, padding: "6px 0" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.themeTitle}</div>
                  <Select
                    id="credits-theme-select"
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
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.langTitle}</div>
                  <Select
                    id="credits-lang-select"
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
            <Button
              id="credits-settings-btn"
              icon={<SettingOutlined />}
              className={styles.settingsBtn}
            >
              Settings
            </Button>
          </Popover>

          <Link id="credits-enter-studio-cta" href="/studio" className={styles.ctaBtnPrimary}>
            {t.enterStudio} <RightOutlined />
          </Link>
        </div>
      </nav>

      {/* Header Section */}
      <header className={styles.sectionContainer} style={{ paddingTop: 120, paddingBottom: 40, textAlign: "center" }}>
        <div className={styles.aiBadge} style={{ margin: "0 auto 20px" }}>
          <HeartFilled style={{ color: "#ec4899" }} /> SPECIAL ACKNOWLEDGMENT & DATASET TAXONOMY
        </div>
        <h1 className={styles.heroTitle}>
          {t.creditsHeroTitle}
        </h1>
        <p className={styles.heroSubtitle} style={{ maxWidth: 840, margin: "0 auto 30px" }}>
          {t.creditsHeroSubtitle}
        </p>
      </header>

      {/* BitMIDI Tribute Hero Card */}
      <section className={styles.sectionContainer} style={{ paddingTop: 0 }}>
        <div
          className={styles.bentoCard}
          style={{
            padding: "3rem",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.9))",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <Tag color="cyan" icon={<GlobalOutlined />} style={{ padding: "4px 10px", fontSize: "0.85rem", marginBottom: 16 }}>
                Open Access Music Archive
              </Tag>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 16px" }}>
                {t.bitmidiAboutTitle}
              </h2>
              <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: "0.98rem" }}>
                {t.bitmidiAboutDesc}
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
                <a
                  id="credits-visit-bitmidi-link"
                  href="https://bitmidi.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button id="credits-visit-bitmidi-btn" type="primary" size="large" icon={<GlobalOutlined />} style={{ backgroundColor: "#0284c7", borderRadius: 10 }}>
                    {t.visitBitmidiBtn}
                  </Button>
                </a>
                <a
                  id="credits-bitmidi-github-link"
                  href="https://github.com/feross/bitmidi.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button id="credits-bitmidi-github-btn" size="large" icon={<GithubOutlined />} style={{ borderRadius: 10, background: "rgba(255,255,255,0.08)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.2)" }}>
                    {t.bitmidiGithubBtn}
                  </Button>
                </a>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ background: "rgba(2, 132, 199, 0.1)", borderColor: "rgba(2, 132, 199, 0.3)", borderRadius: 16 }}>
                <DatabaseOutlined style={{ fontSize: 32, color: "#38bdf8", marginBottom: 12 }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc" }}>17,452</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t.structuredTracks}</div>
              </Card>
              <Card style={{ background: "rgba(168, 85, 247, 0.1)", borderColor: "rgba(168, 85, 247, 0.3)", borderRadius: 16 }}>
                <FileZipOutlined style={{ fontSize: 32, color: "#c084fc", marginBottom: 12 }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc" }}>4.5 MB</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t.compressedShard}</div>
              </Card>
              <Card style={{ background: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)", borderRadius: 16 }}>
                <SafetyCertificateOutlined style={{ fontSize: 32, color: "#34d399", marginBottom: 12 }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc" }}>100%</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t.freeNonProfit}</div>
              </Card>
              <Card style={{ background: "rgba(244, 114, 182, 0.1)", borderColor: "rgba(244, 114, 182, 0.3)", borderRadius: 16 }}>
                <AudioOutlined style={{ fontSize: 32, color: "#f472b6", marginBottom: 12 }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f8fafc" }}>SoundFont</div>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t.realSoundfont}</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Dataset Taxonomy & Categories Section */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>Cấu Trúc Dữ Liệu Tập Tin</div>
          <h2 className={styles.sectionTitle}>
            {t.taxonomyTitle}
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: 680, margin: "12px auto 0" }}>
            {t.taxonomySubtitle}
          </p>
        </div>

        {/* Search Filter Bar */}
        <div style={{ maxWidth: 500, margin: "0 auto 30px" }}>
          <Input
            id="credits-search-taxonomy-input"
            placeholder={t.searchCategoryPlaceholder}
            prefix={<SearchOutlined style={{ color: isLight ? "#0284c7" : "#38bdf8" }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              background: isLight ? "#ffffff" : themeMode === "neon" ? "rgba(10, 10, 35, 0.9)" : themeMode === "retro" ? "rgba(41, 37, 36, 0.9)" : "rgba(15, 23, 42, 0.8)",
              borderColor: isLight ? "#cbd5e1" : themeMode === "neon" ? "rgba(0, 240, 255, 0.4)" : themeMode === "retro" ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.3)",
              color: textColorPrimary,
              boxShadow: isLight ? "0 4px 12px rgba(148, 163, 184, 0.1)" : "none",
            }}
          />
        </div>

        {/* Category Classification Table */}
        <div className={styles.bentoCard} style={{ padding: "1.5rem", overflow: "hidden" }}>
          <ConfigProvider
            theme={{
              algorithm: themeMode === "light" ? theme.defaultAlgorithm : theme.darkAlgorithm,
              components: {
                Table: {
                  colorBgContainer: "transparent",
                  headerBg: themeMode === "light" ? "rgba(241, 245, 249, 0.9)" : "rgba(30, 41, 59, 0.6)",
                  headerColor: themeMode === "light" ? "#0284c7" : themeMode === "neon" ? "#00f0ff" : themeMode === "retro" ? "#f59e0b" : "#38bdf8",
                  rowHoverBg: themeMode === "light" ? "rgba(2, 132, 199, 0.06)" : "rgba(56, 189, 248, 0.08)",
                  borderColor: themeMode === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)",
                },
              },
            }}
          >
            <Table
              dataSource={filteredCategories}
              columns={columns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 800 }}
              style={{ background: "transparent" }}
            />
          </ConfigProvider>
        </div>
      </section>

      {/* Acknowledgments & Special Mentions */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>Danh Sách Đóng Góp</div>
          <h2 className={styles.sectionTitle}>{t.contribTitle}</h2>
        </div>

        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
            <div className={styles.bentoIcon}>
              <TagsOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.ferossTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.ferossDesc}
            </p>
          </div>

          <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
            <div className={styles.bentoIcon}>
              <CheckCircleOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.midiStdTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.midiStdDesc}
            </p>
          </div>

          <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
            <div className={styles.bentoIcon}>
              <HeartFilled style={{ color: "#ec4899" }} />
            </div>
            <h3 className={styles.bentoTitle}>{t.musiciansTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.musiciansDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <footer className={styles.footer}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/studio" style={{ color: "#38bdf8", fontWeight: 600, marginRight: 24 }}>
            {t.enterStudio} <AppstoreOutlined />
          </Link>
          <Link href="/" style={{ color: "#94a3b8", fontWeight: 500 }}>
            {t.homeLink}
          </Link>
        </div>
        <div>© 2026 TN Web MIDI Studio • Dedicated to Open Source Music Archives.</div>
      </footer>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <AppSettingsProvider>
      <MainCreditsContent />
    </AppSettingsProvider>
  );
}
