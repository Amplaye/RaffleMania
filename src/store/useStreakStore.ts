import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from './useAuthStore';
import {useLevelStore} from './useLevelStore';
import {useGameConfigStore, DEFAULT_STREAK_CONFIG} from './useGameConfigStore';

// Streak rewards configuration - Fallback defaults (dynamic values from useGameConfigStore)
export const STREAK_REWARDS = DEFAULT_STREAK_CONFIG;

// Dynamic streak config helper
const getDynamicStreakConfig = () => {
  try {
    return useGameConfigStore.getState().getStreakConfig();
  } catch {
    return STREAK_REWARDS;
  }
};

interface StreakReward {
  xp: number;
  credits: number;
  isWeeklyBonus: boolean;
  isMilestone: boolean;
  milestoneDay?: number;
  weekNumber?: number;
}

// Callback per notificare HomeScreen quando mostrare il popup
type MidnightCallback = (reward: StreakReward) => void;
let midnightCallback: MidnightCallback | null = null;
let midnightTimer: ReturnType<typeof setTimeout> | null = null;

export const setMidnightStreakCallback = (callback: MidnightCallback | null) => {
  midnightCallback = callback;
};

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  lastClaimedDate: string | null; // Nuovo: traccia quando è stato riscosso l'ultimo reward
  totalDaysLoggedIn: number;
  hasClaimedToday: boolean;
  streakBroken: boolean; // Flag per streak interrotta (può essere recuperata)
  missedDays: number; // Numero di giorni persi da recuperare
  recoveryPopupShownDate: string | null; // Data in cui è stato mostrato il popup di recupero
  _hasHydrated: boolean;

  // Actions
  checkAndUpdateStreak: () => Promise<StreakReward | null>;
  checkDayChange: () => boolean; // Nuovo: controlla se il giorno è cambiato
  fetchStreakInfo: () => Promise<void>;
  getNextMilestone: () => number;
  resetStreak: () => void;
  recoverStreak: () => Promise<boolean>; // Recupera tutti i giorni persi con crediti
  getMissedDays: () => number; // Calcola giorni persi
  getRecoveryCost: () => number; // Calcola costo totale per recuperare
  setHasHydrated: (state: boolean) => void;
  getWeekNumber: () => number;
  getDayInWeek: () => number;
  setupMidnightTimer: () => void; // Nuovo: setup timer per mezzanotte
  clearMidnightTimer: () => void; // Nuovo: pulisce il timer
  markRecoveryPopupShown: () => void; // Segna che il popup di recupero è stato mostrato oggi
  shouldShowRecoveryPopup: () => boolean; // Controlla se mostrare il popup oggi
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
  return !isToday(lastLoginDate) && !isYesterday(lastLoginDate);
};

// Calcola quanti giorni sono passati dall'ultimo login (giorni persi)
const calculateMissedDays = (lastLoginDate: string | null): number => {
  if (!lastLoginDate) return 0;
  if (isToday(lastLoginDate) || isYesterday(lastLoginDate)) return 0;

  const lastDate = new Date(lastLoginDate);
  const today = new Date();
  // Reset ore per calcolare solo giorni
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Giorni persi = differenza - 1 (il giorno del login non conta come perso)
  return Math.max(0, diffDays - 1);
};

// Calcola i millisecondi fino alla prossima mezzanotte
const getMillisecondsUntilMidnight = (): number => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
      lastClaimedDate: null,
      totalDaysLoggedIn: 0,
      hasClaimedToday: false,
      streakBroken: false,
      missedDays: 0,
      recoveryPopupShownDate: null,
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

      // Controlla se il giorno è cambiato e resetta hasClaimedToday
      checkDayChange: () => {
        const state = get();

        // Se lastClaimedDate non è oggi, resetta hasClaimedToday
        if (state.lastClaimedDate && !isToday(state.lastClaimedDate)) {
          console.log('[StreakStore] Day changed, resetting hasClaimedToday');
          set({ hasClaimedToday: false });
          return true; // giorno cambiato
        }
        return false;
      },

      // Setup timer per mezzanotte
      setupMidnightTimer: () => {
        // Pulisci timer esistente
        if (midnightTimer) {
          clearTimeout(midnightTimer);
          midnightTimer = null;
        }

        const msUntilMidnight = getMillisecondsUntilMidnight();
        console.log(`[StreakStore] Setting midnight timer for ${msUntilMidnight}ms (${Math.round(msUntilMidnight / 1000 / 60)} minutes)`);

        midnightTimer = setTimeout(async () => {
          console.log('[StreakStore] Midnight! Checking streak...');

          // Resetta hasClaimedToday perché è un nuovo giorno
          set({ hasClaimedToday: false });

          // Prova ad aggiornare lo streak
          const reward = await get().checkAndUpdateStreak();

          // Se c'è un reward e c'è un callback registrato, notifica
          if (reward && midnightCallback) {
            console.log('[StreakStore] Midnight reward available, notifying callback');
            midnightCallback(reward);
          }

          // Riconfigura il timer per la prossima mezzanotte
          get().setupMidnightTimer();
        }, msUntilMidnight);
      },

      clearMidnightTimer: () => {
        if (midnightTimer) {
          clearTimeout(midnightTimer);
          midnightTimer = null;
        }
      },

      checkAndUpdateStreak: async () => {
        const state = get();
        const today = formatDate(new Date());

        // Controlla se il giorno è cambiato e resetta se necessario
        if (state.lastClaimedDate && !isToday(state.lastClaimedDate)) {
          set({ hasClaimedToday: false });
        }

        // Already claimed today (usa lastClaimedDate per maggiore affidabilità)
        if (state.lastClaimedDate && isToday(state.lastClaimedDate) && state.hasClaimedToday) {
          console.log('[StreakStore] Already claimed today, lastClaimedDate:', state.lastClaimedDate);
          return null;
        }

        // Check if streak is broken (needs recovery)
        if (state.lastLoginDate && isStreakBroken(state.lastLoginDate) && state.currentStreak > 0) {
          const missed = calculateMissedDays(state.lastLoginDate);
          console.log('[StreakStore] Streak is broken, missed days:', missed);
          set({ streakBroken: true, missedDays: missed });
          return null; // User needs to recover streak first
        }

        try {
          let newStreak = state.currentStreak;
          let isNewDay = false;

          console.log('[StreakStore] Checking streak - lastLoginDate:', state.lastLoginDate, 'currentStreak:', state.currentStreak);

          if (state.lastLoginDate === null) {
            // Primo login in assoluto
            newStreak = 1;
            isNewDay = true;
            console.log('[StreakStore] First login ever, starting streak at 1');
          } else if (isToday(state.lastLoginDate)) {
            // Già loggato oggi - controlla se ha già riscosso
            if (state.hasClaimedToday) {
              console.log('[StreakStore] Already claimed today');
              return null;
            }
            // Stesso giorno ma non ancora riscosso (non incrementare streak)
            isNewDay = false;
            console.log('[StreakStore] Same day, not yet claimed');
          } else if (isYesterday(state.lastLoginDate)) {
            // Login consecutivo - incrementa streak
            newStreak = Math.min(state.currentStreak + 1, getDynamicStreakConfig().MAX_STREAK);
            isNewDay = true;
            console.log('[StreakStore] Consecutive login! Incrementing to:', newStreak);
          } else {
            // Streak broken - reset to 1
            newStreak = 1;
            isNewDay = true;
            console.log('[StreakStore] Streak broken, resetting to 1');
          }

          // Calcola giorno nella settimana (1-7) e settimana nel ciclo (1-4)
          const dayInWeek = ((newStreak - 1) % 7) + 1;
          const dayInCycle = ((newStreak - 1) % 28) + 1;
          const weekInCycle = Math.ceil(dayInCycle / 7);
          const isDay7 = dayInWeek === 7;

          // Calcola XP e crediti (dynamic from game config)
          const cfg = getDynamicStreakConfig();
          const xp = isDay7 ? cfg.DAY_7_XP : cfg.DAILY_XP;
          let credits = 0;
          if (isDay7) {
            credits = cfg.DAY_7_CREDITS;

            // Aggiungi bonus settimanale extra
            switch (weekInCycle) {
              case 1:
                credits += cfg.WEEK_1_CREDITS;
                break;
              case 2:
                credits += cfg.WEEK_2_CREDITS;
                break;
              case 3:
                credits += cfg.WEEK_3_CREDITS;
                break;
              case 4:
                credits += cfg.WEEK_4_CREDITS;
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

          // Apply XP and credits rewards
          const authStore = useAuthStore.getState();
          const levelStore = useLevelStore.getState();

          // Always award XP for daily login using level store (same as tickets)
          if (reward.xp > 0) {
            console.log('[StreakStore] Awarding XP via level store:', reward.xp);
            const levelUpResult = levelStore.addXP(reward.xp);
            if (levelUpResult) {
              console.log('[StreakStore] Level up!', levelUpResult);
              // Add credit reward for level up
              if (authStore.user && levelUpResult.creditReward > 0) {
                authStore.updateUser({
                  credits: authStore.user.credits + levelUpResult.creditReward,
                });
              }
            }
          }

          // Award credits only on Day 7
          if (reward.credits > 0 && authStore.user) {
            console.log('[StreakStore] Awarding credits:', reward.credits);
            authStore.updateUser({
              credits: authStore.user.credits + reward.credits,
            });
          }

          set({
            currentStreak: newStreak,
            longestStreak: Math.max(state.longestStreak, newStreak),
            lastLoginDate: today,
            lastClaimedDate: today, // Traccia quando è stato riscosso
            totalDaysLoggedIn: isNewDay ? state.totalDaysLoggedIn + 1 : state.totalDaysLoggedIn,
            hasClaimedToday: true,
            streakBroken: false,
          });

          console.log('[StreakStore] Streak updated to:', newStreak, 'lastClaimedDate:', today);
          return reward;
        } catch (error) {
          console.log('[StreakStore] Streak calculation error:', error);
          return null;
        }
      },

      // Calcola i giorni persi dall'ultimo login
      getMissedDays: () => {
        const state = get();
        if (!state.lastLoginDate) return 0;
        return calculateMissedDays(state.lastLoginDate);
      },

      // Calcola il costo totale per recuperare tutti i giorni persi
      getRecoveryCost: () => {
        const state = get();
        const missed = state.missedDays || calculateMissedDays(state.lastLoginDate);
        return missed * getDynamicStreakConfig().RECOVERY_COST_PER_DAY;
      },

      // Recupera la streak usando crediti (dynamic cost per giorno perso)
      recoverStreak: async () => {
        const state = get();

        if (!state.streakBroken) {
          console.log('[StreakStore] Streak not broken, nothing to recover');
          return true; // Streak not broken, nothing to recover
        }

        const missed = state.missedDays || calculateMissedDays(state.lastLoginDate);
        const totalCost = missed * getDynamicStreakConfig().RECOVERY_COST_PER_DAY;

        console.log('[StreakStore] Attempting to recover streak - missed days:', missed, 'cost:', totalCost);

        // Check if user has enough credits
        const authStore = useAuthStore.getState();
        if (!authStore.user || authStore.user.credits < totalCost) {
          console.log('[StreakStore] Not enough credits. Have:', authStore.user?.credits, 'Need:', totalCost);
          return false; // Not enough credits
        }

        // Deduct credits for all missed days
        authStore.updateUser({
          credits: authStore.user.credits - totalCost,
        });

        console.log('[StreakStore] Deducted', totalCost, 'credits. Remaining:', authStore.user.credits - totalCost);

        // Recovery successful - keep current streak, update last login date
        // Set lastLoginDate to yesterday so that checkAndUpdateStreak will increment properly
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        set({
          lastLoginDate: yesterdayStr,
          streakBroken: false,
          missedDays: 0,
          hasClaimedToday: false, // Allow claiming today's reward
        });

        console.log('[StreakStore] Streak recovered! Set lastLoginDate to:', yesterdayStr);
        return true;
      },

      getNextMilestone: () => {
        const {currentStreak} = get();
        return Math.ceil((currentStreak + 1) / 7) * 7;
      },

      resetStreak: () => {
        console.log('[StreakStore] Resetting streak...');
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastLoginDate: null,
          lastClaimedDate: null,
          totalDaysLoggedIn: 0,
          hasClaimedToday: false,
          streakBroken: false,
          missedDays: 0,
          recoveryPopupShownDate: null,
        });
      },

      // Segna che il popup di recupero è stato mostrato oggi
      markRecoveryPopupShown: () => {
        const today = formatDate(new Date());
        console.log('[StreakStore] Marking recovery popup as shown for:', today);
        set({ recoveryPopupShownDate: today });
      },

      // Controlla se mostrare il popup di recupero oggi
      shouldShowRecoveryPopup: () => {
        const state = get();
        const today = formatDate(new Date());

        // Non mostrare se non c'è streak rotta o giorni persi
        if (!state.streakBroken || state.missedDays <= 0) {
          return false;
        }

        // Non mostrare se già mostrato oggi
        if (state.recoveryPopupShownDate === today) {
          console.log('[StreakStore] Recovery popup already shown today');
          return false;
        }

        return true;
      },
    }),
    {
      name: 'rafflemania-streak-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastLoginDate: state.lastLoginDate,
        lastClaimedDate: state.lastClaimedDate,
        totalDaysLoggedIn: state.totalDaysLoggedIn,
        hasClaimedToday: state.hasClaimedToday,
        streakBroken: state.streakBroken,
        missedDays: state.missedDays,
        recoveryPopupShownDate: state.recoveryPopupShownDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);

          // Controlla se il giorno è cambiato e resetta hasClaimedToday
          const today = formatDate(new Date());
          if (state.lastClaimedDate && state.lastClaimedDate !== today) {
            console.log('[StreakStore] Rehydrated - day changed, resetting hasClaimedToday');
            // Non possiamo usare set() qui, quindi lo facciamo nel primo checkAndUpdateStreak
          }

          // Setup midnight timer
          state.setupMidnightTimer();
        }
      },
    }
  )
);
