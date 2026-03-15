import React, { createContext, useContext, useEffect, useState } from 'react';
import { colors, Theme, Colors } from './colors';
import { bootstrapDb } from '@/lib/bootstrap';
import { getSetting, setSetting } from '@/lib/dao';

type ThemeCtx = {
  theme: Theme;
  c: Colors;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  c: colors.dark,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    (async () => {
      try {
        const { db, userId } = await bootstrapDb();
        const ctx = { db, userId };
        const saved = await getSetting(ctx, 'theme');
        if (saved === 'light') setTheme('light');
      } catch {}
    })();
  }, []);

  async function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      const { db, userId } = await bootstrapDb();
      await setSetting({ db, userId }, 'theme', next);
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, c: colors[theme], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
