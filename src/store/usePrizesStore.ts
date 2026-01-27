import {create} from 'zustand';
import {Prize, Draw, Winner, PrizeTimerStatus} from '../types';
import {API_CONFIG} from '../utils/constants';
import apiClient, {getErrorMessage} from '../services/apiClient';
import {
  mockPrizes,
  getCompletedDraws,
  getRecentWinners,
  getMyWins,
} from '../services/mock';

// Durata del timer in secondi (24 ore)
const TIMER_DURATION_SECONDS = 24 * 60 * 60; // 86400 secondi = 24 ore

// Helper per calcolare la data di estrazione
const calculateExtractionDate = (): string => {
  const scheduledAt = new Date();
  scheduledAt.setSeconds(scheduledAt.getSeconds() + TIMER_DURATION_SECONDS);
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

interface PrizesState {
  prizes: Prize[];
  completedDraws: Draw[];
  recentWinners: Winner[];
  myWins: Winner[];
  isLoading: boolean;

  // Actions
  fetchPrizes: () => Promise<void>;
  fetchDraws: () => Promise<void>;
  fetchWinners: () => Promise<void>;
  fetchMyWins: (userId: string) => Promise<void>;
  incrementAdsForPrize: (prizeId: string) => Promise<void>;
  fillPrizeToGoal: (prizeId: string) => void;
  startTimerForPrize: (prizeId: string, durationSeconds?: number) => void;
  markPrizeAsExtracting: (prizeId: string) => void;
  completePrizeExtraction: (prizeId: string) => void;
  resetPrizeForNextRound: (prizeId: string) => void;
  addWin: (prizeId: string, drawId: string, ticketId: string, userId: string) => void;

  // Getters
  getPrizesWithActiveTimer: () => Prize[];
  getPrizeTimerStatus: (prizeId: string) => PrizeTimerStatus | undefined;
}

export const usePrizesStore = create<PrizesState>((set, get) => ({
  prizes: [],
  completedDraws: [],
  recentWinners: [],
  myWins: [],
  isLoading: false,

  fetchPrizes: async () => {
    const currentPrizes = get().prizes;
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        // Preserve local timer data when refreshing
        const mergedPrizes = mockPrizes.map(newPrize => {
          const existing = currentPrizes.find(p => p.id === newPrize.id);
          if (existing && existing.timerStatus !== 'waiting') {
            // Preserve timer data from existing prize
            return {
              ...newPrize,
              currentAds: existing.currentAds,
              timerStatus: existing.timerStatus,
              timerStartedAt: existing.timerStartedAt,
              scheduledAt: existing.scheduledAt,
              extractedAt: existing.extractedAt,
            };
          }
          return newPrize;
        });
        set({prizes: mergedPrizes, isLoading: false});
        return;
      }

      const response = await apiClient.get('/prizes');
      const prizesData = response.data?.data?.prizes || response.data?.prizes || [];
      const apiPrizes = prizesData.map(mapApiPrizeToPrize);

      // Preserve local timer data when refreshing - CRITICAL for timer persistence
      const mergedPrizes = apiPrizes.map((newPrize: Prize) => {
        const existing = currentPrizes.find(p => p.id === newPrize.id);
        if (existing && existing.timerStatus !== 'waiting') {
          // Preserve timer data from existing prize (local state takes priority)
          return {
            ...newPrize,
            currentAds: existing.currentAds,
            timerStatus: existing.timerStatus,
            timerStartedAt: existing.timerStartedAt,
            scheduledAt: existing.scheduledAt,
            extractedAt: existing.extractedAt,
          };
        }
        return newPrize;
      });

      console.log('Loaded prizes from API:', mergedPrizes.length);
      set({prizes: mergedPrizes, isLoading: false});
    } catch (error) {
      console.log('Error fetching prizes, using mock data:', getErrorMessage(error));
      // Fallback to mock data if API fails, preserving timer data
      const mergedPrizes = mockPrizes.map(newPrize => {
        const existing = currentPrizes.find(p => p.id === newPrize.id);
        if (existing && existing.timerStatus !== 'waiting') {
          return {
            ...newPrize,
            currentAds: existing.currentAds,
            timerStatus: existing.timerStatus,
            timerStartedAt: existing.timerStartedAt,
            scheduledAt: existing.scheduledAt,
            extractedAt: existing.extractedAt,
          };
        }
        return newPrize;
      });
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
    // API increment endpoint not available yet - using local state only
    // When API is ready, uncomment the block below
    /*
    try {
      if (!API_CONFIG.USE_MOCK_DATA) {
        await apiClient.post(`/prizes/${prizeId}/increment-ads`);
      }
    } catch (error) {
      console.log('Increment ads API not available');
    }
    */

    set(state => {
      const updatedPrizes = state.prizes.map(prize => {
        if (prize.id !== prizeId) return prize;

        const newCurrentAds = Math.min(prize.currentAds + 1, prize.goalAds);
        const hasReachedGoal = newCurrentAds >= prize.goalAds;
        const shouldStartTimer = hasReachedGoal && prize.timerStatus === 'waiting';

        if (shouldStartTimer) {
          const now = new Date().toISOString();
          return {
            ...prize,
            currentAds: newCurrentAds,
            timerStatus: 'countdown' as PrizeTimerStatus,
            timerStartedAt: now,
            scheduledAt: calculateExtractionDate(),
          };
        }

        return {...prize, currentAds: newCurrentAds};
      });

      return {prizes: updatedPrizes};
    });
  },

  // Fill prize to goal in ONE state update (for debug - avoids UI freeze)
  fillPrizeToGoal: (prizeId: string) => {
    set(state => {
      const updatedPrizes = state.prizes.map(prize => {
        if (prize.id !== prizeId) return prize;

        // Already at goal or timer already started
        if (prize.currentAds >= prize.goalAds || prize.timerStatus !== 'waiting') {
          return prize;
        }

        // Fill to goal and start timer in one update
        const now = new Date().toISOString();
        return {
          ...prize,
          currentAds: prize.goalAds,
          timerStatus: 'countdown' as PrizeTimerStatus,
          timerStartedAt: now,
          scheduledAt: calculateExtractionDate(),
        };
      });

      return {prizes: updatedPrizes};
    });
  },

  // Avvia manualmente il timer per un premio (per debug)
  startTimerForPrize: (prizeId: string, durationSeconds?: number) => {
    set(state => ({
      prizes: state.prizes.map(prize => {
        if (prize.id !== prizeId || prize.timerStatus !== 'waiting') return prize;

        const now = new Date();
        const duration = durationSeconds ?? TIMER_DURATION_SECONDS;
        const scheduledAt = new Date(now.getTime() + duration * 1000);

        return {
          ...prize,
          timerStatus: 'countdown' as PrizeTimerStatus,
          timerStartedAt: now.toISOString(),
          scheduledAt: scheduledAt.toISOString(),
        };
      }),
    }));
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

  // Completa l'estrazione per un premio
  completePrizeExtraction: (prizeId: string) => {
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
        createdAt: new Date().toISOString(),
      };

      return {
        myWins: [newWin, ...state.myWins],
        recentWinners: [newWin, ...state.recentWinners],
      };
    });
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
}));
