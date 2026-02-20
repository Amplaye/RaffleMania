import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Prize, Draw, Winner, PrizeTimerStatus} from '../types';
import {API_CONFIG} from '../utils/constants';
import apiClient, {getErrorMessage} from '../services/apiClient';
import {publishPrizeState} from '../services/firebasePrizes';
import {
  mockPrizes,
  getCompletedDraws,
  getRecentWinners,
  getMyWins,
} from '../services/mock';

// Timer durations based on prize value
// Premi ≤10€: 5 minuti, ≤25€: 5 minuti, >50€: 12 ore
const getTimerDurationForPrize = (prizeValue: number): number => {
  if (prizeValue <= 25) {
    return 5 * 60; // 5 minuti in secondi
  }
  return 12 * 60 * 60; // 12 ore in secondi
};

// Get when timer becomes "urgent" (red) based on prize value
// ≤25€: ultimo minuto, >50€: ultimi 5 minuti
export const getUrgentThresholdForPrize = (prizeValue: number): number => {
  if (prizeValue <= 25) {
    return 60; // Ultimo minuto
  }
  return 5 * 60; // Ultimi 5 minuti
};

// Betting is locked in the last 30 seconds
export const BETTING_LOCK_SECONDS = 30;

// Default timer duration (5 minutes) - used as fallback when prize value unknown
const TIMER_DURATION_SECONDS = 5 * 60;

// Helper per calcolare la data di estrazione basata sul valore del premio
const calculateExtractionDateForPrize = (prizeValue: number): string => {
  const duration = getTimerDurationForPrize(prizeValue);
  const scheduledAt = new Date();
  scheduledAt.setSeconds(scheduledAt.getSeconds() + duration);
  return scheduledAt.toISOString();
};

// HD placeholder images for prizes
const PRIZE_PLACEHOLDER_IMAGES: Record<string, string> = {
  'iphone': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
  'playstation': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&q=80',
  'airpods': 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=800&q=80',
  'nintendo': 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80',
  'amazon': 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
};

// Get appropriate placeholder image based on prize name
const getPlaceholderImage = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('iphone')) return PRIZE_PLACEHOLDER_IMAGES.iphone;
  if (nameLower.includes('playstation') || nameLower.includes('ps5')) return PRIZE_PLACEHOLDER_IMAGES.playstation;
  if (nameLower.includes('airpods')) return PRIZE_PLACEHOLDER_IMAGES.airpods;
  if (nameLower.includes('nintendo') || nameLower.includes('switch')) return PRIZE_PLACEHOLDER_IMAGES.nintendo;
  if (nameLower.includes('amazon') || nameLower.includes('buono')) return PRIZE_PLACEHOLDER_IMAGES.amazon;
  return PRIZE_PLACEHOLDER_IMAGES.default;
};

// Map API prize to app Prize type
const mapApiPrizeToPrize = (apiPrize: any): Prize => ({
  id: String(apiPrize.id),
  name: apiPrize.name,
  description: apiPrize.description || '',
  imageUrl: apiPrize.imageUrl || apiPrize.image_url || getPlaceholderImage(apiPrize.name),
  value: parseFloat(apiPrize.value) || 0,
  stock: apiPrize.stock ?? 1,
  currentAds: apiPrize.currentAds ?? apiPrize.current_ads ?? 0,
  goalAds: apiPrize.goalAds ?? apiPrize.goal_ads ?? 100,
  timerStatus: (apiPrize.timerStatus || apiPrize.timer_status || 'waiting') as PrizeTimerStatus,
  timerDuration: apiPrize.timerDuration ?? apiPrize.timer_duration ?? TIMER_DURATION_SECONDS,
  scheduledAt: apiPrize.scheduledAt || apiPrize.scheduled_at || undefined,
  timerStartedAt: apiPrize.timerStartedAt || apiPrize.timer_started_at || undefined,
  extractedAt: apiPrize.extractedAt || apiPrize.extracted_at || undefined,
  publishAt: apiPrize.publishAt || apiPrize.publish_at || undefined,
  isActive: apiPrize.isActive === true || apiPrize.is_active === 1 || apiPrize.is_active === true,
});

// Map API draw to app Draw type
const mapApiDrawToDraw = (apiDraw: any): Draw => ({
  id: String(apiDraw.id),
  drawId: apiDraw.draw_id,
  prizeId: String(apiDraw.prize_id),
  winningNumber: apiDraw.winning_number,
  winnerUserId: apiDraw.winner_user_id ? String(apiDraw.winner_user_id) : undefined,
  winnerTicketId: apiDraw.winner_ticket_id ? String(apiDraw.winner_ticket_id) : undefined,
  totalTickets: apiDraw.total_tickets || 0,
  extractedAt: apiDraw.extracted_at,
  status: apiDraw.status || 'completed',
  prize: apiDraw.prize ? mapApiPrizeToPrice(apiDraw.prize) : undefined,
});

// Map API winner to app Winner type
const mapApiWinnerToWinner = (apiWinner: any): Winner => ({
  id: String(apiWinner.id),
  drawId: String(apiWinner.draw_id),
  ticketId: String(apiWinner.ticket_id),
  prizeId: String(apiWinner.prize_id),
  userId: String(apiWinner.user_id),
  prize: apiWinner.prize ? mapApiPrizeToPrice(apiWinner.prize) : undefined,
  shippingStatus: apiWinner.shipping_status || 'pending',
  deliveryStatus: apiWinner.deliveryStatus || apiWinner.delivery_status || 'processing',
  deliveredAt: apiWinner.deliveredAt || apiWinner.delivered_at || undefined,
  shippingAddress: apiWinner.shipping_address,
  trackingNumber: apiWinner.tracking_number,
  createdAt: apiWinner.won_at || apiWinner.created_at,
  claimedAt: apiWinner.claimed_at,
});

const mapApiPrizeToPrice = (apiPrize: any): Prize => ({
  id: String(apiPrize.id),
  name: apiPrize.name,
  description: apiPrize.description || '',
  imageUrl: apiPrize.image_url,
  value: parseFloat(apiPrize.value) || 0,
  stock: apiPrize.stock ?? 1,
  currentAds: apiPrize.current_ads || 0,
  goalAds: apiPrize.goal_ads || 100,
  timerStatus: 'completed' as PrizeTimerStatus,
  timerDuration: apiPrize.timer_duration || TIMER_DURATION_SECONDS,
  isActive: true,
});

export type PrizeSortOption = 'default' | 'value_desc' | 'value_asc';

interface PrizesState {
  prizes: Prize[];
  completedDraws: Draw[];
  recentWinners: Winner[];
  myWins: Winner[];
  isLoading: boolean;
  sortBy: PrizeSortOption;

  // Actions
  fetchPrizes: () => Promise<void>;
  fetchDraws: () => Promise<void>;
  fetchWinners: () => Promise<void>;
  fetchMyWins: (userId: string) => Promise<void>;
  incrementAdsForPrize: (prizeId: string) => Promise<void>;
  fillPrizeToGoal: (prizeId: string) => void;
  startTimerForPrize: (prizeId: string, durationSeconds?: number) => void;
  markPrizeAsExtracting: (prizeId: string) => void;
  completePrizeExtraction: (prizeId: string, winningNumber: number) => void;
  resetPrizeAfterExtraction: (prizeId: string) => void;
  resetPrizeForNextRound: (prizeId: string) => void;
  addWin: (prizeId: string, drawId: string, ticketId: string, userId: string) => void;
  syncTimerToBackend: (prizeId: string, timerStatus: string, timerStartedAt?: string, scheduledAt?: string, currentAds?: number) => Promise<void>;
  setSortBy: (sort: PrizeSortOption) => void;

  // Getters
  getPrizesWithActiveTimer: () => Prize[];
  getPrizeTimerStatus: (prizeId: string) => PrizeTimerStatus | undefined;
  getSortedActivePrizes: () => Prize[];
}

// Helper to sort prizes by the selected option
const sortPrizes = (prizes: Prize[], sortBy: PrizeSortOption): Prize[] => {
  if (sortBy === 'value_desc') {
    return [...prizes].sort((a, b) => b.value - a.value);
  }
  if (sortBy === 'value_asc') {
    return [...prizes].sort((a, b) => a.value - b.value);
  }
  return prizes; // default order (from API)
};

export const usePrizesStore = create<PrizesState>()(
  persist(
    (set, get) => ({
  prizes: [],
  completedDraws: [],
  recentWinners: [],
  myWins: [],
  isLoading: false,
  sortBy: 'default' as PrizeSortOption,

  fetchPrizes: async () => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        // Reset timer state on fresh load - don't auto-start extractions
        const mergedPrizes = mockPrizes.map(newPrize => ({
          ...newPrize,
          timerStatus: 'waiting' as PrizeTimerStatus,
          timerStartedAt: undefined,
          scheduledAt: undefined,
          extractedAt: undefined,
        }));
        set({prizes: mergedPrizes, isLoading: false});
        return;
      }

      const response = await apiClient.get('/prizes');
      const prizesData = response.data?.data?.prizes || response.data?.prizes || [];
      const apiPrizes: Prize[] = prizesData.map(mapApiPrizeToPrize);

      // Extract settings from API response and update settings store
      const settingsData = response.data?.data?.settings;
      if (settingsData) {
        try {
          const {useSettingsStore} = require('./useSettingsStore');
          // Use setState to properly update the store
          useSettingsStore.setState({
            xpRewards: {
              WATCH_AD: settingsData.xp?.watch_ad ?? 10,
              SKIP_AD: settingsData.xp?.skip_ad ?? 20,
              PURCHASE_CREDITS: settingsData.xp?.purchase_credits ?? 25,
              WIN_PRIZE: settingsData.xp?.win_prize ?? 250,
              REFERRAL: settingsData.xp?.referral ?? 50,
              DAILY_STREAK: settingsData.xp?.daily_streak ?? 10,
              CREDIT_TICKET: settingsData.xp?.credit_ticket ?? 5,
            },
            credits: {
              PER_TICKET: settingsData.credits?.per_ticket ?? 5,
              REFERRAL_BONUS: settingsData.credits?.referral_bonus ?? 10,
            },
            isLoaded: true,
            lastFetched: Date.now(),
          });
          console.log('Settings loaded from prizes API:', settingsData.xp);
        } catch (e) {
          console.log('Could not update settings store:', e);
        }
      }

      // Use server timer state, but protect active countdown timers from being
      // overwritten with significantly different scheduledAt values (timezone safety)
      const currentPrizes = get().prizes;
      const currentPrizeMap = new Map(currentPrizes.map(p => [p.id, p]));

      const protectedApiPrizes = apiPrizes.map(apiPrize => {
        const local = currentPrizeMap.get(apiPrize.id);
        // If local prize has an active countdown and API also shows countdown,
        // keep the local scheduledAt if the API value differs by more than 2 minutes
        // (protects against timezone conversion issues between server and client)
        if (
          local &&
          local.timerStatus === 'countdown' &&
          apiPrize.timerStatus === 'countdown' &&
          local.scheduledAt &&
          apiPrize.scheduledAt
        ) {
          const localTime = new Date(local.scheduledAt).getTime();
          const apiTime = new Date(apiPrize.scheduledAt).getTime();
          if (Math.abs(apiTime - localTime) > 120000) {
            // API scheduledAt differs by >2 min from local - keep local value
            return {...apiPrize, scheduledAt: local.scheduledAt};
          }
        }
        return apiPrize;
      });

      // Preserve deactivated prizes that user has won (not returned by API anymore)
      // so MyWinsScreen can still display prize names/images
      const apiPrizeIds = new Set(protectedApiPrizes.map(p => p.id));
      const preservedWonPrizes = currentPrizes.filter(p =>
        !apiPrizeIds.has(p.id) && !p.isActive,
      );
      const mergedPrizes = [...protectedApiPrizes, ...preservedWonPrizes];

      console.log('Loaded prizes from API:', apiPrizes.length, preservedWonPrizes.length > 0 ? `(+${preservedWonPrizes.length} won prizes preserved)` : '');
      set({prizes: mergedPrizes, isLoading: false});
    } catch (error) {
      console.log('Error fetching prizes, using mock data:', getErrorMessage(error));
      // Fallback to mock data - reset timer state
      const mergedPrizes = mockPrizes.map(newPrize => ({
        ...newPrize,
        timerStatus: 'waiting' as PrizeTimerStatus,
        timerStartedAt: undefined,
        scheduledAt: undefined,
        extractedAt: undefined,
      }));
      set({prizes: mergedPrizes, isLoading: false});
    }
  },

  fetchDraws: async () => {
    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 600));
        set({completedDraws: getCompletedDraws()});
        return;
      }

      const response = await apiClient.get('/draws');
      const drawsData = response.data?.data?.draws || [];
      const draws = drawsData.map(mapApiDrawToDraw);
      set({completedDraws: draws});
    } catch {
      console.log('Draws API not available, using mock data');
      set({completedDraws: getCompletedDraws()});
    }
  },

  fetchWinners: async () => {
    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({recentWinners: getRecentWinners(10)});
        return;
      }

      const response = await apiClient.get('/winners');
      const winnersData = response.data?.data?.winners || [];
      const winners = winnersData.map(mapApiWinnerToWinner);
      set({recentWinners: winners});
    } catch {
      console.log('Winners API not available, using mock data');
      set({recentWinners: getRecentWinners(10)});
    }
  },

  fetchMyWins: async (userId: string) => {
    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({myWins: getMyWins(userId)});
        return;
      }

      const response = await apiClient.get('/users/me/wins');
      const winsData = response.data?.data?.wins || [];
      const wins = winsData.map(mapApiWinnerToWinner);
      set({myWins: wins});
    } catch {
      console.log('My wins API not available, using mock data');
      set({myWins: getMyWins(userId)});
    }
  },

  // Incrementa biglietti per un premio e avvia il timer se raggiunge il goal
  incrementAdsForPrize: async (prizeId: string) => {
    const prize = get().prizes.find(p => p.id === prizeId);
    if (!prize) return;

    const newCurrentAds = Math.min(prize.currentAds + 1, prize.goalAds);
    const hasReachedGoal = newCurrentAds >= prize.goalAds;
    const shouldStartTimer = hasReachedGoal && prize.timerStatus === 'waiting';

    let timerStartedAt: string | undefined;
    let scheduledAt: string | undefined;

    if (shouldStartTimer) {
      timerStartedAt = new Date().toISOString();
      scheduledAt = calculateExtractionDateForPrize(prize.value);
    }

    set(state => ({
      prizes: state.prizes.map(p => {
        if (p.id !== prizeId) return p;

        if (shouldStartTimer) {
          return {
            ...p,
            currentAds: newCurrentAds,
            timerStatus: 'countdown' as PrizeTimerStatus,
            timerStartedAt: timerStartedAt,
            scheduledAt: scheduledAt,
          };
        }

        return {...p, currentAds: newCurrentAds};
      }),
    }));

    // Sync to backend when timer starts
    if (shouldStartTimer && timerStartedAt && scheduledAt) {
      get().syncTimerToBackend(prizeId, 'countdown', timerStartedAt, scheduledAt, newCurrentAds);
    }

    // Pubblica aggiornamento su Firebase per sync real-time tra utenti
    publishPrizeState(prizeId, {
      currentAds: newCurrentAds,
      timerStatus: shouldStartTimer ? 'countdown' : prize.timerStatus,
      scheduledAt: scheduledAt || prize.scheduledAt,
      timerStartedAt: timerStartedAt || prize.timerStartedAt,
    });
  },

  // Fill prize to goal in ONE state update (for debug - avoids UI freeze)
  fillPrizeToGoal: (prizeId: string) => {
    const prize = get().prizes.find(p => p.id === prizeId);
    if (!prize) {
      console.log('fillPrizeToGoal: Prize not found', prizeId);
      return;
    }

    // Allow starting if timer is 'waiting' OR if already at goal (re-trigger)
    // Also allow if timer was stuck in another state (force restart)
    if (prize.timerStatus === 'countdown' || prize.timerStatus === 'extracting') {
      console.log('fillPrizeToGoal: Timer already active, skipping', prize.timerStatus);
      return;
    }

    const now = new Date().toISOString();
    const scheduledAt = calculateExtractionDateForPrize(prize.value);
    const goalAds = prize.goalAds;

    console.log('fillPrizeToGoal: Starting timer for prize', prizeId, 'scheduledAt:', scheduledAt);

    set(state => ({
      prizes: state.prizes.map(p => {
        if (p.id !== prizeId) return p;
        return {
          ...p,
          currentAds: goalAds,
          timerStatus: 'countdown' as PrizeTimerStatus,
          timerStartedAt: now,
          scheduledAt: scheduledAt,
          extractedAt: undefined, // Clear any previous extraction
        };
      }),
    }));

    // Sync timer to backend
    get().syncTimerToBackend(prizeId, 'countdown', now, scheduledAt, goalAds);

    // Pubblica su Firebase per sync real-time
    publishPrizeState(prizeId, {
      currentAds: goalAds,
      timerStatus: 'countdown',
      scheduledAt,
      timerStartedAt: now,
    });
  },

  // Avvia manualmente il timer per un premio (per debug)
  startTimerForPrize: (prizeId: string, durationSeconds?: number) => {
    const prize = get().prizes.find(p => p.id === prizeId);
    if (!prize) {
      console.log('startTimerForPrize: Prize not found', prizeId);
      return;
    }

    // Don't start if already active
    if (prize.timerStatus === 'countdown' || prize.timerStatus === 'extracting') {
      console.log('startTimerForPrize: Timer already active, skipping', prize.timerStatus);
      return;
    }

    const now = new Date();
    const duration = durationSeconds ?? TIMER_DURATION_SECONDS;
    const scheduledAt = new Date(now.getTime() + duration * 1000);
    const nowIso = now.toISOString();
    const scheduledAtIso = scheduledAt.toISOString();

    console.log('startTimerForPrize: Starting timer for prize', prizeId, 'duration:', duration, 'scheduledAt:', scheduledAtIso);

    set(state => ({
      prizes: state.prizes.map(p => {
        if (p.id !== prizeId) return p;
        return {
          ...p,
          timerStatus: 'countdown' as PrizeTimerStatus,
          timerStartedAt: nowIso,
          scheduledAt: scheduledAtIso,
          extractedAt: undefined, // Clear any previous extraction
        };
      }),
    }));

    // Sync timer to backend
    get().syncTimerToBackend(prizeId, 'countdown', nowIso, scheduledAtIso, prize.currentAds);

    // Pubblica su Firebase per sync real-time
    publishPrizeState(prizeId, {
      currentAds: prize.currentAds,
      timerStatus: 'countdown',
      scheduledAt: scheduledAtIso,
      timerStartedAt: nowIso,
    });
  },

  // Segna un premio come "in estrazione"
  markPrizeAsExtracting: (prizeId: string) => {
    set(state => ({
      prizes: state.prizes.map(prize =>
        prize.id === prizeId && prize.timerStatus === 'countdown'
          ? {...prize, timerStatus: 'extracting' as PrizeTimerStatus}
          : prize,
      ),
    }));
  },

  // Completa l'estrazione per un premio (quando l'utente vince)
  completePrizeExtraction: (prizeId: string, winningNumber: number) => {
    console.log(`Prize ${prizeId} extraction completed. Winner: #${winningNumber}`);
    set(state => ({
      prizes: state.prizes.map(prize =>
        prize.id === prizeId
          ? {
              ...prize,
              timerStatus: 'completed' as PrizeTimerStatus,
              extractedAt: new Date().toISOString(),
            }
          : prize,
      ),
    }));

    // Pulisci i ticket attivi per questo premio (e tutti gli altri premi già estratti)
    import('./useTicketsStore').then(({useTicketsStore}) => {
      useTicketsStore.getState().cleanupExtractedTickets();
    }).catch(() => {});
  },

  // Resetta un premio dopo l'estrazione (quando l'utente perde - pronto per nuovo round)
  resetPrizeAfterExtraction: (prizeId: string) => {
    console.log(`Prize ${prizeId} reset for new round after extraction`);
    // Prima pulisci i ticket attivi per questo premio prima di resettare
    import('./useTicketsStore').then(({useTicketsStore}) => {
      useTicketsStore.getState().clearTicketsForPrize(prizeId);
    }).catch(() => {});

    set(state => ({
      prizes: state.prizes.map(prize =>
        prize.id === prizeId
          ? {
              ...prize,
              currentAds: 0,
              timerStatus: 'waiting' as PrizeTimerStatus,
              scheduledAt: undefined,
              timerStartedAt: undefined,
              extractedAt: undefined,
            }
          : prize,
      ),
    }));
  },

  // Resetta un premio per un nuovo round (dopo estrazione completata)
  resetPrizeForNextRound: (prizeId: string) => {
    set(state => ({
      prizes: state.prizes.map(prize =>
        prize.id === prizeId
          ? {
              ...prize,
              currentAds: 0,
              timerStatus: 'waiting' as PrizeTimerStatus,
              scheduledAt: undefined,
              timerStartedAt: undefined,
              extractedAt: undefined,
            }
          : prize,
      ),
    }));
  },

  addWin: (prizeId: string, drawId: string, ticketId: string, userId: string) => {
    set(state => {
      const prize = state.prizes.find(p => p.id === prizeId);

      const newWin: Winner = {
        id: `win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        drawId,
        ticketId,
        prizeId,
        userId,
        prize,
        shippingStatus: 'pending',
        deliveryStatus: 'processing',
        createdAt: new Date().toISOString(),
      };

      return {
        myWins: [newWin, ...state.myWins],
        recentWinners: [newWin, ...state.recentWinners],
      };
    });
  },

  // Sync timer status to backend (public endpoint - no auth needed)
  syncTimerToBackend: async (prizeId: string, timerStatus: string, timerStartedAt?: string, scheduledAt?: string, currentAds?: number) => {
    if (API_CONFIG.USE_MOCK_DATA) {
      console.log('Mock mode - skipping timer sync');
      return;
    }

    try {
      const payload: any = {timer_status: timerStatus};
      if (timerStartedAt) payload.timer_started_at = timerStartedAt;
      if (scheduledAt) payload.scheduled_at = scheduledAt;
      if (currentAds !== undefined) payload.current_ads = currentAds;

      console.log(`Syncing timer to backend: prize ${prizeId}`, payload);
      await apiClient.post(`/prizes/${prizeId}/sync-timer`, payload);
      console.log('Timer synced successfully');
    } catch (error) {
      console.log('Timer sync failed (non-critical):', getErrorMessage(error));
    }
  },

  // Getters
  getPrizesWithActiveTimer: () => {
    const state = get();
    return state.prizes.filter(
      p => p.timerStatus === 'countdown' || p.timerStatus === 'extracting',
    );
  },

  getPrizeTimerStatus: (prizeId: string) => {
    const state = get();
    return state.prizes.find(p => p.id === prizeId)?.timerStatus;
  },

  setSortBy: (sort: PrizeSortOption) => {
    set({sortBy: sort});
  },

  getSortedActivePrizes: () => {
    const state = get();
    const active = state.prizes.filter(p => p.isActive);
    return sortPrizes(active, state.sortBy);
  },
}),
    {
      name: 'rafflemania-prizes-sort',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sortBy: state.sortBy,
      }),
    },
  ),
);
