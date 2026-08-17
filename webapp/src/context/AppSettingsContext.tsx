"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "dark" | "light" | "neon" | "retro";
export type Language = "vi" | "en" | "ja";

type LanguageTranslations = {
  appTitle: string;
  myPlaylist: string;
  artistsShard: string;
  searchPlaceholder: string;
  allGenres: string;
  pop: string;
  rock: string;
  country: string;
  jazz: string;
  classical: string;
  electronic: string;
  soundtrack: string;
  globalAll: string;
  usEu: string;
  asia: string;
  favoritesOnly: string;
  allTracks: string;
  stageMode: string;
  resetPreset: string;
  noTrackSelected: string;
  selectTrackToStart: string;
  openStageVisualizer: string;
  addToPlaylist: string;
  removeFromPlaylist: string;
  downloadMidi: string;
  tableMode: string;
  gridMode: string;
  compactMode: string;
  vinylMode: string;
  themeTitle: string;
  langTitle: string;
};

const TRANSLATIONS: Record<Language, LanguageTranslations> = {
  vi: {
    appTitle: "TN Web MIDI Studio",
    myPlaylist: "Playlist của tôi",
    artistsShard: "Phân mảnh Ca sĩ",
    searchPlaceholder: "Tìm tên bài hát hoặc ca sĩ...",
    allGenres: "🎵 Tất cả thể loại",
    pop: "🎤 Nhạc Pop",
    rock: "🎸 Nhạc Rock",
    country: "🎻 Nhạc Quê hương / Country",
    jazz: "🎷 Jazz & Blues",
    classical: "🎹 Nhạc Cổ điển",
    electronic: "🎧 Nhạc Điện tử / EDM",
    soundtrack: "🎬 Nhạc Phim & Game",
    globalAll: "🌐 Toàn cầu / Tất cả",
    usEu: "🇺🇸 Âu Mỹ / US-UK",
    asia: "🌏 Châu Á & Anime",
    favoritesOnly: "❤️ Bài hát Yêu thích",
    allTracks: "Tất cả bài hát",
    stageMode: "Sân Thượng Trình Diễn",
    resetPreset: "Khôi phục Playlist Mẫu",
    noTrackSelected: "Chưa chọn bài hát nào",
    selectTrackToStart: "Nhấp chọn bài hát để bắt đầu phát nhạc",
    openStageVisualizer: "Mở Trình Diễn Sân Thượng (Synthesia, Phổ Nhạc, Piano)",
    addToPlaylist: "Thêm vào Playlist Yêu thích",
    removeFromPlaylist: "Bỏ khỏi Playlist Yêu thích",
    downloadMidi: "Tải file .mid về máy",
    tableMode: "Dạng Bảng",
    gridMode: "Dạng Thẻ Grid",
    compactMode: "Danh Sách Siêu Gọn",
    vinylMode: "Đĩa Than Cổ Điển",
    themeTitle: "Giao diện Theme",
    langTitle: "Ngôn ngữ Language",
  },
  en: {
    appTitle: "TN Web MIDI Studio",
    myPlaylist: "My Playlist",
    artistsShard: "Artists Shard",
    searchPlaceholder: "Search title or artist...",
    allGenres: "🎵 All Genres",
    pop: "🎤 Pop Music",
    rock: "🎸 Rock Music",
    country: "🎻 Country Music",
    jazz: "🎷 Jazz & Blues",
    classical: "🎹 Classical Music",
    electronic: "🎧 Electronic / EDM",
    soundtrack: "🎬 Movie & Game OST",
    globalAll: "🌐 Global / All",
    usEu: "🇺🇸 US & Europe",
    asia: "🌏 Asia & Anime",
    favoritesOnly: "❤️ Favorites Only",
    allTracks: "All Tracks",
    stageMode: "Stage Mode",
    resetPreset: "Reset to Preset",
    noTrackSelected: "No track selected",
    selectTrackToStart: "Select a track to start playback",
    openStageVisualizer: "Open Stage Visualizer (Synthesia, Sheet, Piano)",
    addToPlaylist: "Add to Favorite Playlist",
    removeFromPlaylist: "Remove from Playlist",
    downloadMidi: "Download .mid file",
    tableMode: "Table View",
    gridMode: "Grid Cards View",
    compactMode: "Compact List View",
    vinylMode: "Vinyl Showcase View",
    themeTitle: "Theme",
    langTitle: "Language",
  },
  ja: {
    appTitle: "TN Web MIDI スタジオ",
    myPlaylist: "マイプレイリスト",
    artistsShard: "アーティスト・シャード",
    searchPlaceholder: "曲名やアーティストを検索...",
    allGenres: "🎵 すべてのジャンル",
    pop: "🎤 ポップス",
    rock: "🎸 ロック",
    country: "🎻 カントリー",
    jazz: "🎷 ジャズ＆ブルース",
    classical: "🎹 クラシック",
    electronic: "🎧 エレクトロニック",
    soundtrack: "🎬 サウンドトラック",
    globalAll: "🌐 グローバル / すべて",
    usEu: "🇺🇸 欧米 / US-EU",
    asia: "🌏 アジア＆アニメ",
    favoritesOnly: "❤️ お気に入り",
    allTracks: "すべての曲",
    stageMode: "ステージモード",
    resetPreset: "プリセットに戻す",
    noTrackSelected: "曲が選択されていません",
    selectTrackToStart: "再生を開始するには曲を選択してください",
    openStageVisualizer: "ステージビジュアライザーを開く",
    addToPlaylist: "プレイリストに追加",
    removeFromPlaylist: "プレイリストから削除",
    downloadMidi: ".midファイルをダウンロード",
    tableMode: "テーブル表示",
    gridMode: "グリッド表示",
    compactMode: "コンパクト表示",
    vinylMode: "バイナル表示",
    themeTitle: "テーマ",
    langTitle: "言語",
  },
};

type AppSettingsContextType = {
  themeMode: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: LanguageTranslations;
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    const savedTheme = localStorage.getItem("tn_app_theme") as ThemeMode;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTheme) setThemeModeState(savedTheme);

    const savedLang = localStorage.getItem("tn_app_lang") as Language;
     
    if (savedLang) setLanguageState(savedLang);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("tn_app_theme", mode);
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("tn_app_lang", lang);
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.vi;

  return (
    <AppSettingsContext.Provider value={{ themeMode, setThemeMode, language, setLanguage, t }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
};
