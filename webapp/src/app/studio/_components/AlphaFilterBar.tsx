"use client";

import React from "react";
import { ALPHA_KEYS } from "../_lib/studioConstants";
import styles from "@/app/app.module.css";

interface AlphaFilterBarProps {
  selectedAlpha: string;
  onAlphaChange: (alpha: string) => void;
}

export default function AlphaFilterBar({ selectedAlpha, onAlphaChange }: AlphaFilterBarProps) {
  return (
    <div className={styles.alphaBar} role="tablist" aria-label="Alphabet Filter">
      {ALPHA_KEYS.map((key) => (
        <button
          key={key}
          tabIndex={0}
          role="tab"
          aria-selected={selectedAlpha === key}
          aria-label={`Filter artists starting with ${key}`}
          className={`${styles.alphaBtn} ${selectedAlpha === key ? styles.alphaBtnActive : ""}`}
          onClick={() => onAlphaChange(key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAlphaChange(key);
            }
          }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
