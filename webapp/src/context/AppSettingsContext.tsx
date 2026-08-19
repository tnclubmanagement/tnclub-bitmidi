"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type viLocaleType from "../locales/vi.json";
import viFallbackLocale from "../locales/vi.json";

export type ThemeMode = "dark" | "light" | "neon" | "retro";
export type Language = string;

export type LanguageTranslations = typeof viLocaleType;

// Dynamic Template-String Locale Importer (Zero Hardcoding)
const loadLocaleDynamic = async (lang: string): Promise<LanguageTranslations> => {
  try {
    const mod = await import(`../locales/${lang}.json`);
    return mod.default as LanguageTranslations;
  } catch (e) {
    console.warn(`Dynamic locale load failed for language [${lang}], fallback to vi.json`, e);
    return viFallbackLocale;
  }
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
  const [translationsCache, setTranslationsCache] = useState<Record<string, LanguageTranslations>>({
    vi: viFallbackLocale,
  });

  // Dynamic Path Lazy Loading JSON on demand
  useEffect(() => {
    let isMounted = true;
    if (!translationsCache[language]) {
      loadLocaleDynamic(language).then((data) => {
        if (isMounted) {
          setTranslationsCache((prev) => ({ ...prev, [language]: data }));
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [language, translationsCache]);

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

  // Fallback to cached translation or default fallback locale
  const currentTranslation = translationsCache[language] || translationsCache["vi"] || viFallbackLocale;

  return (
    <AppSettingsContext.Provider
      value={{
        themeMode,
        setThemeMode,
        language,
        setLanguage,
        t: currentTranslation,
      }}
    >
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
