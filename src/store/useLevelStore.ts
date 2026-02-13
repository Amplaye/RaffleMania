import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LevelInfo} from '../types';
import {useLevelUpStore} from './useLevelUpStore';
import {useGameConfigStore, DEFAULT_LEVELS, DEFAULT_XP_REWARDS} from './useGameConfigStore';

// XP rewards - Fallback defaults (dynamic values from useGameConfigStore)
export const XP_REWARDS = DEFAULT_XP_REWARDS;

// Level definitions - Fallback defaults (dynamic values from useGameConfigStore)
export const LEVELS: LevelInfo[] = DEFAULT_LEVELS;

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

// Dynamic level helpers - reads from game config store with fallback to hardcoded
const getDynamicLevels = (): LevelInfo[] => {
  try {
    return useGameConfigStore.getState().getLevels() as LevelInfo[];
  } catch {
    return LEVELS;
  }
};

const getDynamicXPRewards = () => {
  try {
    return useGameConfigStore.getState().getXPRewards();
  } catch {
    return XP_REWARDS;
  }
};

const calculateLevel = (totalXP: number): number => {
  const levels = getDynamicLevels();
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].minXP) {
      return levels[i].level;
    }
  }
  return 0;
};

const getLevelByNumber = (level: number): LevelInfo => {
  const levels = getDynamicLevels();
  return levels.find(l => l.level === level) || levels[0];
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
    const rewards = getDynamicXPRewards();
    return get().addXP(rewards.WATCH_AD);
  },

  addXPForTicket: (): LevelUpResult | null => {
    const rewards = getDynamicXPRewards();
    return get().addXP(rewards.PURCHASE_TICKET);
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
