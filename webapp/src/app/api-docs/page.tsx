"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CustomerServiceOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  CheckOutlined,
  RightOutlined,
  SendOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Input, Tag, Popover, Select, message } from "antd";
import { AppSettingsProvider, useAppSettings, ThemeMode, Language } from "@/context/AppSettingsContext";
import styles from "../landing/landing.module.css";

function MainApiDocsContent() {
  const { themeMode, setThemeMode, language, setLanguage, t } = useAppSettings();
  const [searchQuery, setSearchQuery] = useState("Bohemian Rhapsody");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const testApiCall = async () => {
    setLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setApiResponse(JSON.stringify({ error: (e as Error).message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    message.success("Copied code to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const jsExample = `// Example 1: Querying Public API Shard Index (JavaScript / TypeScript)
const res = await fetch('https://your-domain.com/api/v1/search?q=Queen');
const data = await res.json();

console.log('Available SQLite Shards:', data.shards);
// Returns direct static URL to SQLite shard files (Zero-Server Architecture)`;

  const pythonExample = `# Example 2: Querying Shards in Python
import requests

response = requests.get('https://your-domain.com/api/v1/search?q=Queen')
data = response.json()

print("Master Shards:", data['shards'])`;

  const curlExample = `# Example 3: cURL Command
curl -X GET "https://your-domain.com/api/v1/search?q=Queen"`;

  const themeClass = themeMode !== "dark" ? styles[`theme${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`] : "";

  const isLight = themeMode === "light";
  const textColorPrimary = isLight ? "#0f172a" : "#f8fafc";

  return (
    <div className={`${styles.landingContainer} ${themeClass}`}>
      <div className={styles.bgGlowOrb1} />
      <div className={styles.bgGlowOrb2} />

      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <CustomerServiceOutlined style={{ fontSize: 30, color: "#38bdf8" }} />
          <Link id="api-docs-brand-link" href="/" style={{ color: "#f8fafc", textDecoration: "none" }}>
            TN Web MIDI API Docs
          </Link>
        </div>
        <div className={styles.navLinks}>
          <Link id="api-docs-nav-home" href="/" className={styles.navLink}>
            {t.homeLink}
          </Link>
          <Link id="api-docs-nav-credits" href="/credits" className={styles.navLink}>
            {t.credits}
          </Link>
          <Link id="api-docs-nav-api-docs" href="/api-docs" className={styles.navLink} style={{ color: "#38bdf8", fontWeight: 700 }}>
            API Docs
          </Link>

          {/* Quick Settings Popover */}
          <Popover
            content={
              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220, padding: "6px 0" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>{t.themeTitle}</div>
                  <Select
                    id="api-docs-theme-select"
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
                    id="api-docs-lang-select"
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
              id="api-docs-settings-btn"
              icon={<SettingOutlined />}
              className={styles.settingsBtn}
            >
              Settings
            </Button>
          </Popover>

          <Link id="api-docs-enter-studio-cta" href="/studio" className={styles.ctaBtnPrimary}>
            {t.enterStudio} <RightOutlined />
          </Link>
        </div>
      </nav>

      {/* Header Docs */}
      <header className={styles.sectionContainer} style={{ paddingTop: 120, paddingBottom: 40, textAlign: "center" }}>
        <div className={styles.aiBadge} style={{ margin: "0 auto 20px" }}>
          <CodeOutlined /> Public REST API v1.0 • Zero-Server Architecture
        </div>
        <h1 className={styles.heroTitle}>
          {t.apiDocsTitle}
        </h1>
        <p className={styles.heroSubtitle} style={{ maxWidth: 840, margin: "0 auto 30px" }}>
          {t.apiDocsSubtitle}
        </p>
      </header>

      {/* Interactive Try It Live */}
      <section className={styles.sectionContainer} style={{ paddingTop: 0 }}>
        <div className={styles.bentoCard} style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ThunderboltOutlined style={{ fontSize: 24, color: "#38bdf8" }} />
            <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: textColorPrimary }}>
              {t.liveApiExplorer}
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <Tag color="green" style={{ fontSize: "0.9rem", padding: "4px 12px", display: "flex", alignItems: "center", fontWeight: 700 }}>
              GET
            </Tag>
            <Input
              id="api-docs-explorer-input"
              value={`/api/v1/search?q=${searchQuery}`}
              onChange={(e) => {
                const val = e.target.value.split("q=")[1] || e.target.value;
                setSearchQuery(val);
              }}
              style={{
                background: isLight ? "#ffffff" : themeMode === "neon" ? "rgba(10, 10, 35, 0.9)" : themeMode === "retro" ? "rgba(41, 37, 36, 0.9)" : "rgba(3, 7, 18, 0.8)",
                borderColor: isLight ? "#cbd5e1" : themeMode === "neon" ? "rgba(0, 240, 255, 0.4)" : themeMode === "retro" ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.3)",
                color: isLight ? "#0284c7" : "#38bdf8",
                fontWeight: 600,
              }}
            />
            <Button
              id="api-docs-send-request-btn"
              type="primary"
              icon={<SendOutlined />}
              loading={loading}
              onClick={testApiCall}
              style={{ background: "linear-gradient(135deg, #0284c7, #7c3aed)", border: "none" }}
            >
              {t.sendRequest}
            </Button>
          </div>

          {apiResponse && (
            <div style={{ position: "relative" }}>
              <pre
                id="api-docs-explorer-response"
                style={{
                  background: "#030712",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  fontSize: "0.85rem",
                  maxHeight: 300,
                  overflow: "auto",
                }}
              >
                {apiResponse}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Code Examples Section */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTag}>SDK & Code Snippets</div>
          <h2 className={styles.sectionTitle}>
            {t.sdkTitle}
          </h2>
        </div>

        <div className={styles.bentoGrid}>
          {/* JavaScript */}
          <div className={`${styles.bentoCard} ${styles.colSpan12}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag color="cyan">JavaScript / Fetch API</Tag>
              <Button
                id="api-docs-copy-js-btn"
                type="text"
                size="small"
                icon={copiedCode === "js" ? <CheckOutlined style={{ color: "#10b981" }} /> : <CopyOutlined style={{ color: "#9ca3af" }} />}
                onClick={() => copyToClipboard(jsExample, "js")}
                style={{ color: "#9ca3af" }}
              >
                Copy
              </Button>
            </div>
            <pre style={{ background: "#030712", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "#f3f4f6", margin: 0, fontSize: "0.85rem", overflowX: "auto" }}>
              {jsExample}
            </pre>
          </div>

          {/* Python */}
          <div className={`${styles.bentoCard} ${styles.colSpan6}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag color="blue">Python</Tag>
              <Button
                id="api-docs-copy-python-btn"
                type="text"
                size="small"
                icon={copiedCode === "py" ? <CheckOutlined style={{ color: "#10b981" }} /> : <CopyOutlined style={{ color: "#9ca3af" }} />}
                onClick={() => copyToClipboard(pythonExample, "py")}
                style={{ color: "#9ca3af" }}
              >
                Copy
              </Button>
            </div>
            <pre style={{ background: "#030712", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "#f3f4f6", margin: 0, fontSize: "0.85rem", overflowX: "auto" }}>
              {pythonExample}
            </pre>
          </div>

          {/* cURL */}
          <div className={`${styles.bentoCard} ${styles.colSpan6}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag color="purple">cURL</Tag>
              <Button
                id="api-docs-copy-curl-btn"
                type="text"
                size="small"
                icon={copiedCode === "curl" ? <CheckOutlined style={{ color: "#10b981" }} /> : <CopyOutlined style={{ color: "#9ca3af" }} />}
                onClick={() => copyToClipboard(curlExample, "curl")}
                style={{ color: "#9ca3af" }}
              >
                Copy
              </Button>
            </div>
            <pre style={{ background: "#030712", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "#f3f4f6", margin: 0, fontSize: "0.85rem", overflowX: "auto" }}>
              {curlExample}
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div style={{ marginBottom: 20 }}>
          <Link id="api-docs-footer-studio-link" href="/studio" style={{ color: "#38bdf8", fontWeight: 600, marginRight: 24 }}>
            {t.enterStudio}
          </Link>
          <Link id="api-docs-footer-home-link" href="/" style={{ color: "#94a3b8", fontWeight: 500 }}>
            Trang Chủ Landing Page
          </Link>
        </div>
        <div>© 2026 TN Web MIDI Studio • Public API Ready for Third-Party Developers.</div>
      </footer>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <AppSettingsProvider>
      <MainApiDocsContent />
    </AppSettingsProvider>
  );
}
