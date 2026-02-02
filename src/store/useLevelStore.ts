import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LevelInfo} from '../types';
import {useLevelUpStore} from './useLevelUpStore';

// XP rewards - Sistema definitivo
export const XP_REWARDS = {
  WATCH_AD: 3,           // Guardare pubblicità = 3 XP
  PURCHASE_TICKET: 2,    // Acquistare biglietto = 2 XP
  // Legacy values (kept for compatibility)
  SKIP_AD: 0,
  PURCHASE_CREDITS: 0,
  WIN_PRIZE: 0,
  REFERRAL: 0,
};

// Level definitions with credit rewards
// L'utente parte dal livello 0
export const LEVELS: LevelInfo[] = [
  {level: 0, name: 'Principiante', minXP: 0, maxXP: 1000, icon: 'leaf', color: '#FF6B00', creditReward: 0},
  {level: 1, name: 'Novizio', minXP: 1000, maxXP: 2200, icon: 'flash', color: '#FF6B00', creditReward: 5},
  {level: 2, name: 'Apprendista', minXP: 2200, maxXP: 3800, icon: 'compass', color: '#FF6B00', creditReward: 10},
  {level: 3, name: 'Esploratore', minXP: 3800, maxXP: 5800, icon: 'map', color: '#FF6B00', creditReward: 20},
  {level: 4, name: 'Avventuriero', minXP: 5800, maxXP: 8300, icon: 'shield', color: '#FF6B00', creditReward: 35},
  {level: 5, name: 'Veterano', minXP: 8300, maxXP: 11500, icon: 'medal', color: '#FF6B00', creditReward: 50},
  {level: 6, name: 'Campione', minXP: 11500, maxXP: 15500, icon: 'ribbon', color: '#FF6B00', creditReward: 65},
  {level: 7, name: 'Maestro', minXP: 15500, maxXP: 20500, icon: 'star', color: '#FF6B00', creditReward: 80},
  {level: 8, name: 'Leggenda', minXP: 20500, maxXP: 26500, icon: 'diamond', color: '#FF6B00', creditReward: 90},
  {level: 9, name: 'Mito', minXP: 26500, maxXP: 33500, icon: 'flame', color: '#FF6B00', creditReward: 95},
  {level: 10, name: 'Divinita', minXP: 33500, maxXP: 999999, icon: 'trophy', color: '#FFD700', creditReward: 100},
];

// Totale crediti ottenibili: 5+10+20+35+50+65+80+90+95+100 = 550 crediti

interface LevelUpResult {
  newLevel: number;
  creditReward: number;
  levelName: string;
}

interface LevelState {
  currentXP: number;
  totalXP: number;
  level: number;
  claimedLevelRewards: number[]; // Livelli per cui sono già stati riscattati i premi

  // Actions
  addXP: (amount: number) => LevelUpResult | null;
  addXPForAd: () => LevelUpResult | null;
  addXPForTicket: () => LevelUpResult | null;
  getLevelInfo: () => LevelInfo;
  getProgressToNextLevel: () => number;
  getXPForNextLevel: () => number;
  getXPInCurrentLevel: () => number;
  getTotalXPForCurrentLevel: () => number;
  getNextLevelReward: () => number;
  resetLevel: () => void;
}

const calculateLevel = (totalXP: number): number => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) {
      return LEVELS[i].level;
    }
  }
  return 0;
};

const getLevelByNumber = (level: number): LevelInfo => {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
};

export const useLevelStore = create<LevelState>()(
  persist(
    (set, get) => ({
  currentXP: 0,
  totalXP: 0,
  level: 0,
  claimedLevelRewards: [],

  addXP: (amount: number): LevelUpResult | null => {
    const {totalXP, level, claimedLevelRewards} = get();
    const newTotalXP = totalXP + amount;
    const newLevel = calculateLevel(newTotalXP);
    const levelInfo = getLevelByNumber(newLevel);
    const currentXPInLevel = newTotalXP - levelInfo.minXP;

    let levelUpResult: LevelUpResult | null = null;

    // Check if leveled up and reward not yet claimed
    if (newLevel > level && !claimedLevelRewards.includes(newLevel)) {
      const newLevelInfo = getLevelByNumber(newLevel);
      const creditReward = newLevelInfo.creditReward || 0;

      levelUpResult = {
        newLevel,
        creditReward,
        levelName: newLevelInfo.name,
      };

      // Trigger level up overlay
      useLevelUpStore.getState().triggerLevelUp(level, newLevel, creditReward);

      // Mark reward as claimed
      set({
        claimedLevelRewards: [...claimedLevelRewards, newLevel],
      });
    }

    set({
      totalXP: newTotalXP,
      currentXP: currentXPInLevel,
      level: newLevel,
    });

    return levelUpResult;
  },

  addXPForAd: (): LevelUpResult | null => {
    return get().addXP(XP_REWARDS.WATCH_AD);
  },

  addXPForTicket: (): LevelUpResult | null => {
    return get().addXP(XP_REWARDS.PURCHASE_TICKET);
  },

  getLevelInfo: () => {
    const {level} = get();
    return getLevelByNumber(level);
  },

  getProgressToNextLevel: () => {
    const {totalXP, level} = get();
    const currentLevelInfo = getLevelByNumber(level);
    const xpInCurrentLevel = totalXP - currentLevelInfo.minXP;
    const xpNeededForLevel = currentLevelInfo.maxXP - currentLevelInfo.minXP;
    return Math.min((xpInCurrentLevel / xpNeededForLevel) * 100, 100);
  },

  getXPForNextLevel: () => {
    const {totalXP, level} = get();
    const currentLevelInfo = getLevelByNumber(level);
    return Math.max(currentLevelInfo.maxXP - totalXP, 0);
  },

  getXPInCurrentLevel: () => {
    const {totalXP, level} = get();
    const currentLevelInfo = getLevelByNumber(level);
    return totalXP - currentLevelInfo.minXP;
  },

  getTotalXPForCurrentLevel: () => {
    const {level} = get();
    const currentLevelInfo = getLevelByNumber(level);
    return currentLevelInfo.maxXP - currentLevelInfo.minXP;
  },

  getNextLevelReward: () => {
    const {level} = get();
    const nextLevel = level + 1;
    if (nextLevel > 10) return 0;
    const nextLevelInfo = getLevelByNumber(nextLevel);
    return nextLevelInfo.creditReward || 0;
  },

  resetLevel: () => {
    set({
      currentXP: 0,
      totalXP: 0,
      level: 0,
      claimedLevelRewards: [],
    });
  },
}),
    {
      name: 'rafflemania-level-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentXP: state.currentXP,
        totalXP: state.totalXP,
        level: state.level,
        claimedLevelRewards: state.claimedLevelRewards,
      }),
    }
  )
);
