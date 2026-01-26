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

// Map API prize to app Prize type
const mapApiPrizeToPrize = (apiPrize: any): Prize => ({
  id: String(apiPrize.id),
  name: apiPrize.name,
  description: apiPrize.description || '',
  imageUrl: apiPrize.image_url,
  value: parseFloat(apiPrize.value) || 0,
  currentAds: apiPrize.current_ads || 0,
  goalAds: apiPrize.goal_ads || 100,
  timerStatus: (apiPrize.timer_status || 'waiting') as PrizeTimerStatus,
  timerDuration: apiPrize.timer_duration || TIMER_DURATION_SECONDS,
  scheduledAt: apiPrize.scheduled_at || undefined,
  timerStartedAt: apiPrize.timer_started_at || undefined,
  extractedAt: apiPrize.extracted_at || undefined,
  isActive: apiPrize.is_active === 1 || apiPrize.is_active === true,
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
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({prizes: mockPrizes, isLoading: false});
        return;
      }

      const response = await apiClient.get('/prizes');
      const prizes = response.data.data.prizes.map(mapApiPrizeToPrize);
      set({prizes, isLoading: false});
    } catch (error) {
      console.error('Error fetching prizes:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  fetchDraws: async () => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 600));
        set({completedDraws: getCompletedDraws(), isLoading: false});
        return;
      }

      const response = await apiClient.get('/draws');
      const draws = response.data.data.draws.map(mapApiDrawToDraw);
      set({completedDraws: draws, isLoading: false});
    } catch (error) {
      console.error('Error fetching draws:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  fetchWinners: async () => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({recentWinners: getRecentWinners(10), isLoading: false});
        return;
      }

      const response = await apiClient.get('/winners');
      const winners = response.data.data.winners.map(mapApiWinnerToWinner);
      set({recentWinners: winners, isLoading: false});
    } catch (error) {
      console.error('Error fetching winners:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  fetchMyWins: async (userId: string) => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({myWins: getMyWins(userId), isLoading: false});
        return;
      }

      const response = await apiClient.get('/users/me/wins');
      const wins = response.data.data.wins.map(mapApiWinnerToWinner);
      set({myWins: wins, isLoading: false});
    } catch (error) {
      console.error('Error fetching my wins:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  // Incrementa biglietti per un premio e avvia il timer se raggiunge il goal
  incrementAdsForPrize: async (prizeId: string) => {
    try {
      if (!API_CONFIG.USE_MOCK_DATA) {
        await apiClient.post(`/prizes/${prizeId}/increment-ads`);
      }

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
    } catch (error) {
      console.error('Error incrementing ads:', getErrorMessage(error));
    }
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
