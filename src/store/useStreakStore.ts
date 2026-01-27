import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  checkAndUpdateStreak: () => Promise<StreakReward | null>;
  fetchStreakInfo: () => Promise<void>;
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

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: null,
  totalDaysLoggedIn: 0,
  hasClaimedToday: false,

  fetchStreakInfo: async () => {
    // Streak API not available yet - using local state only
    // When API is ready, uncomment the block below
    /*
    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        return;
      }
      const response = await apiClient.get('/users/me/streak');
      const data = response.data.data;
      set({
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        lastLoginDate: data.last_streak_date,
        hasClaimedToday: data.claimed_today || false,
      });
    } catch (error) {
      console.log('Streak API not available');
    }
    */
  },

  checkAndUpdateStreak: async () => {
    const state = get();
    const today = formatDate(new Date());

    // Already claimed today
    if (state.lastLoginDate && isToday(state.lastLoginDate) && state.hasClaimedToday) {
      return null;
    }

    // Always use local calculation (API endpoint not available yet)
    // When API is ready, uncomment the block below
    /*
    try {
      if (!API_CONFIG.USE_MOCK_DATA) {
        const response = await apiClient.post('/users/me/streak/claim');
        const data = response.data.data;
        const reward: StreakReward = {
          xp: data.xp_earned || 0,
          credits: data.credits_earned || 0,
          isWeeklyBonus: data.is_weekly_bonus || false,
          isMilestone: data.is_milestone || false,
        };
        set({
          currentStreak: data.current_streak,
          longestStreak: Math.max(state.longestStreak, data.current_streak),
          lastLoginDate: today,
          hasClaimedToday: true,
        });
        const authStore = useAuthStore.getState();
        await authStore.refreshUserData();
        return reward;
      }
    } catch (error) {
      console.log('Streak API not available, using local calculation');
    }
    */

    try {
      // Local calculation
      let newStreak = state.currentStreak;
      let isNewDay = false;

      if (state.lastLoginDate === null) {
        newStreak = 1;
        isNewDay = true;
      } else if (isToday(state.lastLoginDate)) {
        if (state.hasClaimedToday) {
          return null;
        }
        isNewDay = false;
      } else if (isYesterday(state.lastLoginDate)) {
        newStreak = Math.min(state.currentStreak + 1, STREAK_REWARDS.MAX_STREAK);
        isNewDay = true;
      } else {
        newStreak = 1;
        isNewDay = true;
      }

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

      set({
        currentStreak: newStreak,
        longestStreak: Math.max(state.longestStreak, newStreak),
        lastLoginDate: today,
        totalDaysLoggedIn: isNewDay ? state.totalDaysLoggedIn + 1 : state.totalDaysLoggedIn,
        hasClaimedToday: true,
      });

      return reward;
    } catch {
      console.log('Streak calculation error, returning null');
      return null;
    }
  },

  getNextMilestone: () => {
    const {currentStreak} = get();
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
}),
    {
      name: 'rafflemania-streak-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastLoginDate: state.lastLoginDate,
        totalDaysLoggedIn: state.totalDaysLoggedIn,
        hasClaimedToday: state.hasClaimedToday,
      }),
    }
  )
);
