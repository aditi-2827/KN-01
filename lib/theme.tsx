"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeId = 1 | 2 | 3 | 4 | 5;

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  swatches: string[];
}

export const THEMES: ThemeInfo[] = [
  {
    id: 1,
    name: "Riverside",
    swatches: ["#99CDD8", "#DAEBE3", "#FDEBD3", "#F3C3B2", "#CFD6C4"],
  },
  {
    id: 2,
    name: "Botanical",
    swatches: ["#0A3323", "#839958", "#F7F4D5", "#D3968C", "#105666"],
  },
  {
    id: 3,
    name: "Ember",
    swatches: ["#210100", "#E6A341", "#FECE79", "#B14A36", "#8C0902"],
  },
  {
    id: 4,
    name: "Sapphire",
    swatches: ["#3C5070", "#112250", "#E0C58F", "#F5F0E9", "#D9CCC2"],
  },
  {
    id: 5,
    name: "Rose Noir",
    swatches: ["#000000", "#1A1515", "#B07878", "#E6C3BF", "#F9EBE5"],
  },
];

const THEME_KEY = "journal-theme";

interface ThemeContextValue {
  theme: ThemeInfo;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function detectTheme(): ThemeInfo {
  if (typeof window === "undefined") return THEMES[0];
  try {
    const stored = Number(localStorage.getItem(THEME_KEY));
    const found = THEMES.find((t) => t.id === stored);
    if (found) return found;
  } catch {
    /* ignore */
  }
  return THEMES[0];
}

function applyThemeAttribute(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", String(id));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeInfo>(() => detectTheme());

  useEffect(() => {
    applyThemeAttribute(theme.id);
    try {
      localStorage.setItem(THEME_KEY, String(theme.id));
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState((current) => (current.id === id ? current : THEMES.find((t) => t.id === id) ?? current));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}