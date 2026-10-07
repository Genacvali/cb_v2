import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Sun, Moon, Star, Heart, Circle, LucideIcon } from 'lucide-react';

export type Theme = 'light' | 'dark' | 'night' | 'pink' | 'ebony';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'crystalbudget-theme';
const THEMES: Theme[] = ['light', 'dark', 'night', 'pink', 'ebony'];

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy init from storage so the first render already uses the saved theme
  // (index.html applies the class pre-paint; this keeps React state in sync).
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...THEMES);
    root.classList.add(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable (private mode); theme still applies for the session.
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const THEME_OPTIONS: { value: Theme; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Светлая', Icon: Sun },
  { value: 'dark', label: 'Тёмная', Icon: Moon },
  { value: 'night', label: 'Ночная', Icon: Star },
  { value: 'pink', label: 'Розовая', Icon: Heart },
  { value: 'ebony', label: 'Эбони', Icon: Circle },
];