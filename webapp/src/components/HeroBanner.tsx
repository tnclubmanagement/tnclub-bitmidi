"use client";

import React from "react";
import { ThunderBoltOutlined, DatabaseOutlined, AudioOutlined } from "@ant-design/icons";
import styles from "@/app/app.module.css";

export default function HeroBanner() {
  return (
    <div className={styles.heroCard}>
      <div className={styles.heroContent}>
        <div className={styles.heroTag}>
          <ThunderBoltOutlined /> Local-First Web Audio Studio
        </div>
        <h1 className={styles.heroHeading}>
          Khám Phá & Thưởng Thức <span>17,000+ Nhạc MIDI</span> Siêu Tốc
        </h1>
        <p className={styles.heroSubtext}>
          Trải nghiệm phát nhạc MIDI độc đáo ngay trên trình duyệt mà không cần Server. 
          Ứng dụng truy xuất dữ liệu SQLite tĩnh siêu nhỏ bằng công nghệ <strong>HTTP Range Requests</strong> và tổng hợp âm thanh Piano chất lượng cao.
        </p>

        <div className={styles.heroFeatures}>
          <div className={styles.featureItem}>
            <DatabaseOutlined className={styles.featureIcon} />
            <div>
              <strong>SQLite Range Queries</strong>
              <span>Truy xuất dữ liệu 0ms latency</span>
            </div>
          </div>
          <div className={styles.featureItem}>
            <AudioOutlined className={styles.featureIcon} />
            <div>
              <strong>SoundFont Synthesizer</strong>
              <span>Tổng hợp âm thanh Piano chân thực</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
