import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

export type ColorThemeId = 'parchemin' | 'ocean' | 'sakura' | 'emerald';

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  colors: Record<string, string>;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'parchemin',
    name: 'Parchemin',
    colors: {
      '--color-primary': '#7B9AC4',
      '--color-primary-light': '#A8BDD8',
      '--color-primary-dark': '#6085AD',
      '--color-surface': '#F0EBE3',
      '--color-surface-dim': '#E3DACC',
      '--color-surface-dark': '#141413',
      '--color-surface-dark-dim': '#1C1C1A',
      '--color-border': '#D4CAB9',
      '--color-border-dark': '#2D2D29',
      '--color-text': '#3A3630',
      '--color-text-muted': '#8B8178',
      '--color-text-dark': '#E5DDD1',
      '--color-text-dark-muted': '#877F73',
      '--color-accent': '#7B9AC4',
      '--color-accent-light': '#A8BDD8',
      '--color-success': '#8BBF9F',
      '--color-warning': '#E2B866',
      '--color-danger': '#CD7B72',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      '--color-primary': '#5B8FD4',
      '--color-primary-light': '#8BB4E8',
      '--color-primary-dark': '#4A7BC0',
      '--color-surface': '#EDF1F7',
      '--color-surface-dim': '#DDE4EF',
      '--color-surface-dark': '#0D1520',
      '--color-surface-dark-dim': '#131D2C',
      '--color-border': '#C4D0E1',
      '--color-border-dark': '#1E2D42',
      '--color-text': '#2A3444',
      '--color-text-muted': '#6B7A8F',
      '--color-text-dark': '#D5DEE8',
      '--color-text-dark-muted': '#6E7F94',
      '--color-accent': '#5B8FD4',
      '--color-accent-light': '#8BB4E8',
      '--color-success': '#6BBF93',
      '--color-warning': '#E8C05A',
      '--color-danger': '#D46B6B',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    colors: {
      '--color-primary': '#C47B94',
      '--color-primary-light': '#D8A8BB',
      '--color-primary-dark': '#AD607D',
      '--color-surface': '#F5EDF0',
      '--color-surface-dim': '#EBDCE2',
      '--color-surface-dark': '#1A1215',
      '--color-surface-dark-dim': '#221A1E',
      '--color-border': '#DCC4CC',
      '--color-border-dark': '#352830',
      '--color-text': '#3E2E35',
      '--color-text-muted': '#8F757F',
      '--color-text-dark': '#E8D5DC',
      '--color-text-dark-muted': '#8A6F7A',
      '--color-accent': '#C47B94',
      '--color-accent-light': '#D8A8BB',
      '--color-success': '#8BBF9F',
      '--color-warning': '#E2B866',
      '--color-danger': '#CD7B72',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      '--color-primary': '#5FA87A',
      '--color-primary-light': '#8DC4A0',
      '--color-primary-dark': '#4A8F64',
      '--color-surface': '#EDF3EF',
      '--color-surface-dim': '#DCE6DE',
      '--color-surface-dark': '#111A14',
      '--color-surface-dark-dim': '#182119',
      '--color-border': '#C0D4C5',
      '--color-border-dark': '#243029',
      '--color-text': '#2C3A30',
      '--color-text-muted': '#6D8173',
      '--color-text-dark': '#D5E5DA',
      '--color-text-dark-muted': '#6D8575',
      '--color-accent': '#5FA87A',
      '--color-accent-light': '#8DC4A0',
      '--color-success': '#5FA87A',
      '--color-warning': '#D4AD4E',
      '--color-danger': '#C47264',
    },
  },
];

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorThemeId;
  toggle: () => void;
  setColorTheme: (id: ColorThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'dumbledore_theme';
const COLOR_THEME_KEY = 'dumbledore_color_theme';

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialColorTheme(): ColorThemeId {
  const saved = localStorage.getItem(COLOR_THEME_KEY);
  if (COLOR_THEMES.some((t) => t.id === saved)) return saved as ColorThemeId;
  return 'parchemin';
}

function applyColorTheme(id: ColorThemeId) {
  const preset = COLOR_THEMES.find((t) => t.id === id);
  if (!preset) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(preset.colors)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(getInitialColorTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyColorTheme(colorTheme);
    localStorage.setItem(COLOR_THEME_KEY, colorTheme);
  }, [colorTheme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggle, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
