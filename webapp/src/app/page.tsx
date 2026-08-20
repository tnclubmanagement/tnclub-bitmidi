"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CustomerServiceOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  DatabaseOutlined,
  AudioOutlined,
  StarOutlined,
  RightOutlined,
  CheckCircleFilled,
  PauseCircleOutlined,
  SlidersOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Tag, Space, Spin, Popover, Select } from "antd";
import { AppSettingsProvider, useAppSettings, ThemeMode, Language } from "@/context/AppSettingsContext";
import { AudioParticleCanvas } from "@/components/AudioParticleCanvas";
import styles from "./landing/landing.module.css";

function MainLandingContent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Scroll Reveal Observer
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.sectionVisible);
        }
      });
    };

    const observerOptions: IntersectionObserverInit = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const revealElements = document.querySelectorAll(`.${styles.scrollRevealSection}`);

    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Dynamic Neural Wave Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 340);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    let step = 0;
    const render = () => {
      step += 0.03;
      ctx.clearRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Animated Neural Audio Waveforms
      const lines = [
        { color: "rgba(56, 189, 248, 0.8)", speed: 1, amp: 40, freq: 0.01 },
        { color: "rgba(168, 85, 247, 0.7)", speed: 1.3, amp: 30, freq: 0.015 },
        { color: "rgba(244, 114, 182, 0.6)", speed: 0.8, amp: 20, freq: 0.008 },
      ];

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = line.color;

        for (let x = 0; x < width; x += 5) {
          const y =
            height / 2 +
            Math.sin(x * line.freq + step * line.speed) * line.amp * Math.sin(step * 0.5) +
            Math.cos(x * 0.02 + step) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Floating Glow Particles
      for (let i = 0; i < 15; i++) {
        const px = (Math.sin(step * 0.2 + i * 1.5) * 0.5 + 0.5) * width;
        const py = (Math.cos(step * 0.3 + i * 0.8) * 0.5 + 0.5) * height;
        ctx.fillStyle = i % 2 === 0 ? "rgba(56, 189, 248, 0.6)" : "rgba(168, 85, 247, 0.6)";
        ctx.beginPath();
        ctx.arc(px, py, (i % 3) + 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const { themeMode, setThemeMode, language, setLanguage, t } = useAppSettings();
  const [promptText, setPromptText] = useState(t.defaultPromptText);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOutput, setGenerationOutput] = useState<string | null>(null);

  // Sync promptText when language changes
  useEffect(() => {
    requestAnimationFrame(() => {
      setPromptText(t.defaultPromptText);
      setGenerationOutput((prev) => (prev ? t.aiOutputSuccess : null));
    });
  }, [language, t.defaultPromptText, t.aiOutputSuccess]);

  const handleSimulateAiGeneration = () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setGenerationOutput(null);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationOutput(t.aiOutputSuccess);
    }, 2000);
  };

  return (
    <div className={styles.landingContainer}>
      {/* Glow Orbs */}
      <div className={styles.bgGlowOrb1} />
      <div className={styles.bgGlowOrb2} />

      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <CustomerServiceOutlined style={{ fontSize: 30, color: "#38bdf8" }} />
          <span>TN MIDI AI Studio</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>
            {t.features}
          </a>
          <a href="#ai-engine" className={styles.navLink}>
            {t.aiEngine}
          </a>
          <Link href="/credits" className={styles.navLink}>
            {t.credits}
          </Link>

          {/* Quick Settings Popover on Landing Page */}
          <Popover
            content={
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220, padding: "6px 0" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.themeTitle}</div>
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
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.langTitle}</div>
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
            <Button
              icon={<SettingOutlined />}
              className={styles.settingsBtn}
            >
              Settings
            </Button>
          </Popover>

          <Link href="/studio" className={styles.ctaBtnPrimary}>
            {t.enterStudio} <RightOutlined />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`${styles.heroSection} ${styles.scrollRevealSection}`}>
        <div className={styles.aiBadge}>
          <StarOutlined /> AI-Powered Web Audio Engine • 2026 Standard
        </div>
        <h1 className={styles.heroTitle}>
          {t.heroTitle}
        </h1>
        <p className={styles.heroSubtitle}>
          {t.heroSubtitle}
        </p>

        <div className={styles.heroActions}>
          <Link href="/studio" className={styles.ctaBtnPrimary} style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}>
            {t.exploreStudio} <RightOutlined />
          </Link>
          <a href="#demo" className={styles.ctaBtnSecondary}>
            <PlayCircleOutlined /> {t.listenDemo}
          </a>
        </div>

        {/* Dynamic 3D Neural Canvas Box */}
        <div className={styles.visualizerHeroBox}>
          <AudioParticleCanvas themeMode={themeMode} />
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          <div className={styles.canvasOverlay}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Tag color="cyan" icon={<ThunderboltOutlined />}>
                REALTIME AUDIO VISUALIZER
              </Tag>
              <Tag color="purple">17,452 MIDI TRACKS READY</Tag>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 500 }}>
                Synthesizer Latency: <strong>0.2ms</strong> | Client-Side Audio Context Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Live Demo Showcase Section */}
      <section id="demo" className={`${styles.sectionContainer} ${styles.scrollRevealSection}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>{t.demoTag}</div>
          <h2 className={styles.sectionTitle}>
            {t.demoTitle}
          </h2>
        </div>

        <div className={styles.bentoCard} style={{ maxWidth: 800, margin: "0 auto", padding: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f9fafb" }}>
                🎼 Queen — Bohemian Rhapsody (MIDI Remastered)
              </div>
              <div style={{ color: "#9ca3af", fontSize: "0.9rem", marginTop: 4 }}>
                {t.demoSubtitle}
              </div>
            </div>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isPlayingDemo ? <PauseCircleOutlined style={{ fontSize: 24 }} /> : <PlayCircleOutlined style={{ fontSize: 24 }} />}
              onClick={() => setIsPlayingDemo(!isPlayingDemo)}
              style={{ width: 56, height: 56, background: "linear-gradient(135deg, #0284c7, #7c3aed)", border: "none" }}
            />
          </div>

          {/* Equalizer Visual Bar */}
          <div style={{ display: "flex", gap: 6, height: 48, alignItems: "flex-end", padding: "8px 0" }}>
            {[40, 70, 30, 90, 50, 80, 100, 45, 85, 65, 95, 35, 75, 60, 90, 50, 80, 40].map((h, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: isPlayingDemo ? `${h}%` : "15%",
                  background: "linear-gradient(to top, #38bdf8, #a855f7)",
                  borderRadius: 4,
                  transition: "height 0.15s ease-in-out",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid AI Features Section */}
      <section id="features" className={`${styles.sectionContainer} ${styles.scrollRevealSection}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>{t.featuresTag}</div>
          <h2 className={styles.sectionTitle}>
            {t.featuresTitle}
          </h2>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1: Zero-Server SQLite */}
          <div className={`${styles.bentoCard} ${styles.colSpan8}`}>
            <div className={styles.bentoIcon}>
              <DatabaseOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.sqliteTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.sqliteDesc}
            </p>
          </div>

          {/* Card 2: High Fidelity Soundfont */}
          <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
            <div className={styles.bentoIcon}>
              <AudioOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.soundfontTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.soundfontDesc}
            </p>
          </div>

          {/* Card 3: AI Assistant */}
          <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
            <div className={styles.bentoIcon}>
              <RobotOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.aiAssistantTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.aiAssistantDesc}
            </p>
          </div>

          {/* Card 4: Realtime Visualizer Stage */}
          <div className={`${styles.bentoCard} ${styles.colSpan8}`}>
            <div className={styles.bentoIcon}>
              <SlidersOutlined />
            </div>
            <h3 className={styles.bentoTitle}>{t.visualizerTitle}</h3>
            <p className={styles.bentoDesc}>
              {t.visualizerDesc}
            </p>
          </div>
        </div>
      </section>

      {/* AI Playground Simulator Section */}
      <section id="ai-engine" className={`${styles.sectionContainer} ${styles.scrollRevealSection}`}>
        <div className={styles.aiSimulatorCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <RobotOutlined style={{ fontSize: 28, color: "#c084fc" }} />
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#f9fafb" }}>
              {t.aiComposerTitle}
            </h3>
          </div>
          <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.95rem" }}>
            {t.aiComposerSubtitle}
          </p>

          <div className={styles.promptInputBox}>
            <StarOutlined style={{ color: "#38bdf8", fontSize: 18 }} />
            <input
              className={styles.promptInput}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t.aiPromptPlaceholder}
            />
            <Button
              type="primary"
              icon={isGenerating ? <Spin size="small" /> : <ThunderboltOutlined />}
              onClick={handleSimulateAiGeneration}
              disabled={isGenerating}
              style={{ borderRadius: 12, background: "linear-gradient(135deg, #a855f7, #0284c7)", border: "none" }}
            >
              {isGenerating ? t.aiGenerating : t.aiGenerateBtn}
            </Button>
          </div>

          {generationOutput && (
            <div
              style={{
                marginTop: 20,
                padding: "16px 20px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 14,
                color: "#6ee7b7",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircleFilled style={{ color: "#10b981", fontSize: 18 }} />
              <span>{generationOutput}</span>
            </div>
          )}
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className={`${styles.sectionContainer} ${styles.scrollRevealSection}`}>
        <div className={styles.statsGrid}>
          <div>
            <div className={styles.statNumber}>17,000+</div>
            <div className={styles.statLabel}>{t.statTracks}</div>
          </div>
          <div>
            <div className={styles.statNumber}>0 ms</div>
            <div className={styles.statLabel}>{t.statLatency}</div>
          </div>
          <div>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>{t.statSecurity}</div>
          </div>
          <div>
            <div className={styles.statNumber}>2026</div>
            <div className={styles.statLabel}>{t.statAudioStandard}</div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className={styles.footer}>
        <div style={{ marginBottom: 20 }}>
          <Space size="large">
            <Link href="/studio" style={{ color: "#38bdf8", fontWeight: 600 }}>
              {t.enterStudio} <AppstoreOutlined />
            </Link>
          </Space>
        </div>
      </footer>
    </div>
  );
}

export default function RootLandingPage() {
  return (
    <AppSettingsProvider>
      <MainLandingContent />
    </AppSettingsProvider>
  );
}
