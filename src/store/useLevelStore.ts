import {create} from 'zustand';
import {LevelInfo} from '../types';

// XP rewards (halved from original values)
export const XP_REWARDS = {
  WATCH_AD: 5,
  SKIP_AD: 12,
  PURCHASE_CREDITS: 25,
  WIN_PRIZE: 250,
  REFERRAL: 50,
};

// Level definitions - Increased XP requirements
export const LEVELS: LevelInfo[] = [
  {level: 1, name: 'Novizio', minXP: 0, maxXP: 200, icon: 'leaf', color: '#FF6B00'},
  {level: 2, name: 'Apprendista', minXP: 200, maxXP: 500, icon: 'flash', color: '#FF6B00'},
  {level: 3, name: 'Esploratore', minXP: 500, maxXP: 1000, icon: 'compass', color: '#FF6B00'},
  {level: 4, name: 'Avventuriero', minXP: 1000, maxXP: 1800, icon: 'map', color: '#FF6B00'},
  {level: 5, name: 'Veterano', minXP: 1800, maxXP: 3000, icon: 'shield', color: '#FF6B00'},
  {level: 6, name: 'Campione', minXP: 3000, maxXP: 4500, icon: 'medal', color: '#FF6B00'},
  {level: 7, name: 'Maestro', minXP: 4500, maxXP: 6500, icon: 'ribbon', color: '#FF6B00'},
  {level: 8, name: 'Leggenda', minXP: 6500, maxXP: 9000, icon: 'star', color: '#FF6B00'},
  {level: 9, name: 'Mito', minXP: 9000, maxXP: 12000, icon: 'diamond', color: '#FF6B00'},
  {level: 10, name: 'Divinita', minXP: 12000, maxXP: 999999, icon: 'trophy', color: '#FF6B00'},
];

interface LevelState {
  currentXP: number;
  totalXP: number;
  level: number;

  // Actions
  addXP: (amount: number) => void;
  getLevelInfo: () => LevelInfo;
  getProgressToNextLevel: () => number;
  getXPForNextLevel: () => number;
  resetLevel: () => void;
}

const calculateLevel = (totalXP: number): number => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) {
      return LEVELS[i].level;
    }
  }
  return 1;
};

const getLevelByNumber = (level: number): LevelInfo => {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
};

export const useLevelStore = create<LevelState>((set, get) => ({
  currentXP: 0,
  totalXP: 0,
  level: 1,

  addXP: (amount: number) => {
    const {totalXP} = get();
    const newTotalXP = totalXP + amount;
    const newLevel = calculateLevel(newTotalXP);
    const levelInfo = getLevelByNumber(newLevel);
    const currentXPInLevel = newTotalXP - levelInfo.minXP;

    set({
      totalXP: newTotalXP,
      currentXP: currentXPInLevel,
      level: newLevel,
    });
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
    return currentLevelInfo.maxXP - totalXP;
  },

  resetLevel: () => {
    set({
      currentXP: 0,
      totalXP: 0,
      level: 1,
    });
  },
}));
