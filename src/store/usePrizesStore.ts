import {create} from 'zustand';
import {Prize, Draw, Winner} from '../types';
import {
  mockPrizes,
  getNextDraw,
  getCompletedDraws,
  getUpcomingDraws,
  getRecentWinners,
  getMyWins,
} from '../services/mock';

interface PrizesState {
  prizes: Prize[];
  currentDraw: Draw | null;
  upcomingDraws: Draw[];
  completedDraws: Draw[];
  recentWinners: Winner[];
  myWins: Winner[];
  isLoading: boolean;

  // Actions
  fetchPrizes: () => Promise<void>;
  fetchDraws: () => Promise<void>;
  fetchWinners: () => Promise<void>;
  fetchMyWins: (userId: string) => Promise<void>;
  incrementAdsForPrize: (prizeId: string) => void;
}

export const usePrizesStore = create<PrizesState>((set) => ({
  prizes: [],
  currentDraw: null,
  upcomingDraws: [],
  completedDraws: [],
  recentWinners: [],
  myWins: [],
  isLoading: false,

  fetchPrizes: async () => {
    set({isLoading: true});
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
    set({
      prizes: mockPrizes,
      isLoading: false,
    });
  },

  fetchDraws: async () => {
    set({isLoading: true});
    await new Promise<void>(resolve => setTimeout(() => resolve(), 600));

    const nextDraw = getNextDraw();
    const upcoming = getUpcomingDraws();
    const completed = getCompletedDraws();

    set({
      currentDraw: nextDraw || null,
      upcomingDraws: upcoming,
      completedDraws: completed,
      isLoading: false,
    });
  },

  fetchWinners: async () => {
    set({isLoading: true});
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
    set({
      recentWinners: getRecentWinners(10),
      isLoading: false,
    });
  },

  fetchMyWins: async (userId: string) => {
    set({isLoading: true});
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
    set({
      myWins: getMyWins(userId),
      isLoading: false,
    });
  },

  incrementAdsForPrize: (prizeId: string) => {
    set(state => ({
      prizes: state.prizes.map(prize =>
        prize.id === prizeId
          ? {...prize, currentAds: Math.min(prize.currentAds + 1, prize.goalAds)}
          : prize,
      ),
    }));
  },
}));
