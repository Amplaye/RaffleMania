import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from './useAuthStore';
import {useLevelStore} from './useLevelStore';

// Streak rewards configuration secondo il documento
export const STREAK_REWARDS = {
  // Giorni 1-6: +5 XP
  DAILY_XP: 5,
  // Giorno 7: 1 Credito + 10 XP
  DAY_7_XP: 10,
  DAY_7_CREDITS: 1,
  // Reward extra settimanali (fine della settimana)
  WEEK_1_CREDITS: 1,
  WEEK_2_CREDITS: 2,
  WEEK_3_CREDITS: 3,
  WEEK_4_CREDITS: 5,
  WEEK_4_BONUS_XP: 100,
  MAX_STREAK: 1000,
};

interface StreakReward {
  xp: number;
  credits: number;
  isWeeklyBonus: boolean;
  isMilestone: boolean;
  milestoneDay?: number;
  weekNumber?: number;
}

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalDaysLoggedIn: number;
  hasClaimedToday: boolean;
  streakBroken: boolean; // Flag per streak interrotta (può essere recuperata)
  _hasHydrated: boolean;

  // Actions
  checkAndUpdateStreak: () => Promise<StreakReward | null>;
  fetchStreakInfo: () => Promise<void>;
  getNextMilestone: () => number;
  resetStreak: () => void;
  recoverStreak: (method: 'ad' | 'credit') => Promise<boolean>;
  setHasHydrated: (state: boolean) => void;
  getWeekNumber: () => number;
  getDayInWeek: () => number;
}

// Format date in local timezone (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday) === dateStr;
};

const isToday = (dateStr: string): boolean => {
  return formatDate(new Date()) === dateStr;
};

// Calcola se la streak è stata interrotta (più di 1 giorno dall'ultimo login)
const isStreakBroken = (lastLoginDate: string | null): boolean => {
  if (!lastLoginDate) return false;
  const today = formatDate(new Date());
  return !isToday(lastLoginDate) && !isYesterday(lastLoginDate);
};

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
      totalDaysLoggedIn: 0,
      hasClaimedToday: false,
      streakBroken: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      getWeekNumber: () => {
        const {currentStreak} = get();
        // Settimana 1 = giorni 1-7, Settimana 2 = giorni 8-14, etc.
        // Ciclo di 4 settimane (28 giorni), poi riparte
        const dayInCycle = ((currentStreak - 1) % 28) + 1;
        return Math.ceil(dayInCycle / 7);
      },

      getDayInWeek: () => {
        const {currentStreak} = get();
        // Giorno 1-7 nella settimana corrente
        return ((currentStreak - 1) % 7) + 1;
      },

      fetchStreakInfo: async () => {
        // Streak API not available yet - using local state only
      },

      checkAndUpdateStreak: async () => {
        const state = get();
        const today = formatDate(new Date());

        // Already claimed today
        if (state.lastLoginDate && isToday(state.lastLoginDate) && state.hasClaimedToday) {
          return null;
        }

        // Check if streak is broken (needs recovery)
        if (state.lastLoginDate && isStreakBroken(state.lastLoginDate) && state.currentStreak > 0) {
          set({ streakBroken: true });
          return null; // User needs to recover streak first
        }

        try {
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
            // Streak broken - reset to 1
            newStreak = 1;
            isNewDay = true;
          }

          // Calcola giorno nella settimana (1-7) e settimana nel ciclo (1-4)
          const dayInWeek = ((newStreak - 1) % 7) + 1;
          const dayInCycle = ((newStreak - 1) % 28) + 1;
          const weekInCycle = Math.ceil(dayInCycle / 7);
          const isDay7 = dayInWeek === 7;

          // Calcola XP
          let xp = STREAK_REWARDS.DAILY_XP; // Default: 5 XP per giorni 1-6
          if (isDay7) {
            xp = STREAK_REWARDS.DAY_7_XP; // 10 XP per giorno 7
          }

          // Calcola crediti
          let credits = 0;
          if (isDay7) {
            credits = STREAK_REWARDS.DAY_7_CREDITS; // 1 credito per giorno 7

            // Aggiungi bonus settimanale extra
            switch (weekInCycle) {
              case 1:
                credits += STREAK_REWARDS.WEEK_1_CREDITS; // +1 credito
                break;
              case 2:
                credits += STREAK_REWARDS.WEEK_2_CREDITS; // +2 crediti
                break;
              case 3:
                credits += STREAK_REWARDS.WEEK_3_CREDITS; // +3 crediti
                break;
              case 4:
                credits += STREAK_REWARDS.WEEK_4_CREDITS; // +5 crediti
                xp += STREAK_REWARDS.WEEK_4_BONUS_XP; // +100 XP bonus
                break;
            }
          }

          const reward: StreakReward = {
            xp,
            credits,
            isWeeklyBonus: isDay7,
            isMilestone: weekInCycle === 4 && isDay7,
            milestoneDay: isDay7 ? newStreak : undefined,
            weekNumber: weekInCycle,
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
            streakBroken: false,
          });

          return reward;
        } catch {
          console.log('Streak calculation error, returning null');
          return null;
        }
      },

      // Recupera la streak guardando ads o usando 1 credito
      recoverStreak: async (method: 'ad' | 'credit') => {
        const state = get();

        if (!state.streakBroken) {
          return true; // Streak not broken, nothing to recover
        }

        if (method === 'credit') {
          // Check if user has credits
          const authStore = useAuthStore.getState();
          if (!authStore.user || authStore.user.credits < 1) {
            return false; // Not enough credits
          }

          // Deduct 1 credit
          authStore.updateUser({
            credits: authStore.user.credits - 1,
          });
        }

        // If method is 'ad', assume ad was already watched
        // Recovery successful - keep current streak, update last login date
        const today = formatDate(new Date());

        set({
          lastLoginDate: today,
          streakBroken: false,
          hasClaimedToday: false, // Allow claiming today's reward
        });

        return true;
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
          streakBroken: false,
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
        streakBroken: state.streakBroken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
