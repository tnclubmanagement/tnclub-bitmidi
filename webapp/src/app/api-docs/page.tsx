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
} from "@ant-design/icons";
import { Button, Input, Tag, message } from "antd";
import styles from "../landing/landing.module.css";

export default function ApiDocsPage() {
  const [searchQuery, setSearchQuery] = useState("Bohemian Rhapsody");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const testApiCall = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
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

  return (
    <div className={styles.landingContainer}>
      <div className={styles.bgGlowOrb1} />
      <div className={styles.bgGlowOrb2} />

      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <CustomerServiceOutlined style={{ fontSize: 30, color: "#38bdf8" }} />
          <span>TN Web MIDI API Docs</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Trang Chủ AI Landing
          </Link>
          <Link href="/studio" className={styles.ctaBtnPrimary}>
            Vào Web Studio <RightOutlined />
          </Link>
        </div>
      </nav>

      {/* Header Docs */}
      <header className={styles.heroSection} style={{ padding: "4rem 5% 2rem" }}>
        <div className={styles.aiBadge}>
          <CodeOutlined /> Public REST API v1.0 • GitHub Pages Compatible
        </div>
        <h1 className={styles.heroTitle}>
          Public API Cho <span className={styles.gradientText}>Bên Thứ 3 (Third-Party)</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Dễ dàng kết nối và tích hợp dữ liệu kho nhạc 17,000+ MIDI tracks vào ứng dụng của bạn. Không cần Server Backend, hoàn toàn tĩnh và tối ưu trên GitHub Pages.
        </p>
      </header>

      {/* Interactive Try It Live */}
      <section className={styles.sectionContainer} style={{ padding: "2rem 5% 4rem" }}>
        <div className={styles.bentoCard} style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ThunderboltOutlined style={{ fontSize: 24, color: "#38bdf8" }} />
            <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#f8fafc" }}>
              Live API Explorer (Thử Nghiệm Trực Tiếp)
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <Tag color="green" style={{ fontSize: "0.9rem", padding: "4px 12px", display: "flex", alignItems: "center" }}>
              GET
            </Tag>
            <Input
              value={`/api/v1/search?q=${searchQuery}`}
              onChange={(e) => {
                const val = e.target.value.split("q=")[1] || "";
                setSearchQuery(val);
              }}
              style={{ background: "rgba(3, 7, 18, 0.8)", borderColor: "rgba(255, 255, 255, 0.15)", color: "#38bdf8", fontWeight: 600 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={loading}
              onClick={testApiCall}
              style={{ background: "linear-gradient(135deg, #0284c7, #7c3aed)", border: "none" }}
            >
              Send Request
            </Button>
          </div>

          {apiResponse && (
            <div style={{ position: "relative" }}>
              <pre
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
      <section className={styles.sectionContainer} style={{ padding: "0 5% 5rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: 800, marginBottom: "2.5rem" }}>
          Hướng Dẫn Tích Hợp Code (SDK & Code Snippets)
        </h2>

        <div className={styles.bentoGrid}>
          {/* JavaScript */}
          <div className={`${styles.bentoCard} ${styles.colSpan12}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Tag color="cyan">JavaScript / Fetch API</Tag>
              <Button
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
        <div>© 2026 TN Web MIDI Studio • Public API Ready for Third-Party Developers.</div>
      </footer>
    </div>
  );
}
