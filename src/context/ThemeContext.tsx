import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  // Track if user has explicitly chosen a theme
  const [userSelected, setUserSelected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme | null;
      return stored === 'light' || stored === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (userSelected) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, userSelected]);

  // Listen for system theme changes if user hasn't explicitly chosen
  useEffect(() => {
    if (!userSelected && typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setThemeState(media.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
  }, [userSelected]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setUserSelected(true);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      setUserSelected(true);
      localStorage.setItem('theme', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
