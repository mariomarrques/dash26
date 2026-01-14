import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'dash26-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  // Add new theme class
  root.classList.add(theme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#f5f6f8');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with stored theme or default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() || 'system';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme();
    if (stored && stored !== 'system') return stored;
    return getSystemTheme();
  });

  // Resolve the actual theme based on preference
  const resolveTheme = useCallback((themePreference: Theme): ResolvedTheme => {
    if (themePreference === 'system') {
      return getSystemTheme();
    }
    return themePreference;
  }, []);

  // Apply theme to document
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme, resolveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Prevent flash of wrong theme on initial load
  useEffect(() => {
    const stored = getStoredTheme();
    const initialTheme = stored || 'system';
    const resolved = resolveTheme(initialTheme);
    applyTheme(resolved);
  }, [resolveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
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

// Sistema de temas (dark/light + toggle + system preference) implementado no Dash 26
