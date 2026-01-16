import {create} from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  setTheme: (theme: ThemeMode) => {
    set({theme});
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    set({theme: currentTheme === 'light' ? 'dark' : 'light'});
  },
}));
