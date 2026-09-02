import { theme, ThemeConfig } from "antd";
import { ThemeMode } from "@/context/AppSettingsContext";

export function getAntdTheme(themeMode: ThemeMode): ThemeConfig {
  if (themeMode === "light") {
    return {
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: "#0284c7",
        colorBgContainer: "#ffffff",
        colorBgLayout: "#f8fafc",
        colorText: "#0f172a",
      },
    };
  }
  if (themeMode === "neon") {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#06b6d4",
        colorBgContainer: "#050b14",
        colorBgLayout: "#020617",
        colorText: "#38bdf8",
      },
    };
  }
  if (themeMode === "retro") {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#d97706",
        colorBgContainer: "#1c1917",
        colorBgLayout: "#0c0a09",
        colorText: "#fef3c7",
      },
    };
  }
  // Default Dark Mode
  return {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: "#0284c7",
      colorBgContainer: "#0f172a",
      colorBgLayout: "#090d16",
      colorText: "#f8fafc",
    },
  };
}
