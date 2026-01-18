import {create} from 'zustand';
import {useAuthStore} from './useAuthStore';
import {useLevelStore} from './useLevelStore';

// Streak rewards configuration
export const STREAK_REWARDS = {
  DAILY_XP: 5,            // Days 1-6: 5 XP
  WEEKLY_XP: 10,          // Day 7: 10 XP
  WEEKLY_CREDITS: 1,      // Day 7: 1 credit
  MAX_STREAK: 1000,
};

interface StreakReward {
  xp: number;
  credits: number;
  isWeeklyBonus: boolean;
  isMilestone: boolean;
}

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalDaysLoggedIn: number;
  hasClaimedToday: boolean;

  // Actions
  checkAndUpdateStreak: () => StreakReward | null;
  getNextMilestone: () => number;
  resetStreak: () => void;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday) === dateStr;
};

const isToday = (dateStr: string): boolean => {
  return formatDate(new Date()) === dateStr;
};

export const useStreakStore = create<StreakState>((set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: null,
  totalDaysLoggedIn: 0,
  hasClaimedToday: false,

  checkAndUpdateStreak: () => {
    const state = get();
    const today = formatDate(new Date());

    // Already claimed today
    if (state.lastLoginDate && isToday(state.lastLoginDate) && state.hasClaimedToday) {
      return null;
    }

    let newStreak = state.currentStreak;
    let isNewDay = false;

    // Check if this is continuing a streak or starting fresh
    if (state.lastLoginDate === null) {
      // First ever login
      newStreak = 1;
      isNewDay = true;
    } else if (isToday(state.lastLoginDate)) {
      // Same day, don't increase streak but allow claiming if not claimed
      if (state.hasClaimedToday) {
        return null;
      }
      isNewDay = false;
    } else if (isYesterday(state.lastLoginDate)) {
      // Consecutive day - increase streak
      newStreak = Math.min(state.currentStreak + 1, STREAK_REWARDS.MAX_STREAK);
      isNewDay = true;
    } else {
      // Streak broken - reset to 1
      newStreak = 1;
      isNewDay = true;
    }

    // Calculate rewards based on day in week (1-7)
    const dayInWeek = ((newStreak - 1) % 7) + 1;
    const isDay7 = dayInWeek === 7;

    const reward: StreakReward = {
      xp: isDay7 ? STREAK_REWARDS.WEEKLY_XP : STREAK_REWARDS.DAILY_XP,
      credits: isDay7 ? STREAK_REWARDS.WEEKLY_CREDITS : 0,
      isWeeklyBonus: isDay7,
      isMilestone: false,
    };

    // Apply rewards
    const levelStore = useLevelStore.getState();
    levelStore.addXP(reward.xp);

    if (reward.credits > 0) {
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        authStore.updateUser({
          credits: authStore.user.credits + reward.credits,
        });
      }
    }

    // Update state
    set({
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
      lastLoginDate: today,
      totalDaysLoggedIn: isNewDay ? state.totalDaysLoggedIn + 1 : state.totalDaysLoggedIn,
      hasClaimedToday: true,
    });

    return reward;
  },

  getNextMilestone: () => {
    const {currentStreak} = get();
    // Next multiple of 7
    return Math.ceil((currentStreak + 1) / 7) * 7;
  },

  resetStreak: () => {
    set({
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
      totalDaysLoggedIn: 0,
      hasClaimedToday: false,
    });
  },
}));
