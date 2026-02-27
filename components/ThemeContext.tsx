import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "NULL_BLACK" | "DEEP_SEA" | "OBSIDIAN_GREEN";

interface ThemeColors {
  bg: string;
  tint: string;
}

export const THEMES: Record<Theme, ThemeColors> = {
  NULL_BLACK: { bg: "#000000", tint: "#000000" },
  DEEP_SEA: { bg: "#020810", tint: "#00111F" },
  OBSIDIAN_GREEN: { bg: "#010801", tint: "#001A00" },
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "NULL_BLACK",
  colors: THEMES["NULL_BLACK"],
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("NULL_BLACK");

  useEffect(() => {
    AsyncStorage.getItem("null_theme").then((v) => {
      if (v) setThemeState(v as Theme);
    });
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem("null_theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
