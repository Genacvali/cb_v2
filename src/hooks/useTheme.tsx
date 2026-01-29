import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'night' | 'pink' | 'ebony';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'crystalbudget-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (stored && ['light', 'dark', 'night', 'pink', 'ebony'].includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'night', 'pink', 'ebony');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

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

export const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Светлая', icon: '☀️' },
  { value: 'dark', label: 'Тёмная', icon: '🌙' },
  { value: 'night', label: 'Ночная', icon: '🌃' },
  { value: 'pink', label: 'Розовая', icon: '🌸' },
  { value: 'ebony', label: 'Эбони', icon: '🖤' },
];