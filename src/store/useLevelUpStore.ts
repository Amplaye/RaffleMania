import {create} from 'zustand';
import {LevelInfo} from '../types';
import {LEVELS} from './useLevelStore';

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  oldLevelInfo: LevelInfo;
  newLevelInfo: LevelInfo;
  creditReward: number;
}

interface LevelUpState {
  isVisible: boolean;
  levelUpData: LevelUpData | null;

  // Actions
  showLevelUp: (data: LevelUpData) => void;
  hideLevelUp: () => void;
  triggerLevelUp: (oldLevel: number, newLevel: number, creditReward: number) => void;
}

const getLevelByNumber = (level: number): LevelInfo => {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
};

export const useLevelUpStore = create<LevelUpState>((set) => ({
  isVisible: false,
  levelUpData: null,

  showLevelUp: (data: LevelUpData) => {
    set({isVisible: true, levelUpData: data});
  },

  hideLevelUp: () => {
    set({isVisible: false, levelUpData: null});
  },

  triggerLevelUp: (oldLevel: number, newLevel: number, creditReward: number) => {
    const oldLevelInfo = getLevelByNumber(oldLevel);
    const newLevelInfo = getLevelByNumber(newLevel);

    set({
      isVisible: true,
      levelUpData: {
        oldLevel,
        newLevel,
        oldLevelInfo,
        newLevelInfo,
        creditReward,
      },
    });
  },
}));
