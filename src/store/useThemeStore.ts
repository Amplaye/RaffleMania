import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
  theme: 'light',

  setTheme: (theme: ThemeMode) => {
    set({theme});
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    set({theme: currentTheme === 'light' ? 'dark' : 'light'});
  },
}),
    {
      name: 'rafflemania-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
