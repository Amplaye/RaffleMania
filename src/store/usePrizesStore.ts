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

// Helper per generare un nuovo draw dinamico
const generateNextDraw = (prizes: Prize[], existingDrawIds: string[]): Draw => {
  // Trova un premio casuale per il nuovo draw
  const randomPrize = prizes[Math.floor(Math.random() * prizes.length)] || prizes[0];

  // Genera un ID unico
  const drawId = `draw_dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Imposta la data al prossimo slot disponibile (30 secondi nel futuro per test, in produzione sarebbe domani alle 20:00)
  const scheduledAt = new Date();
  scheduledAt.setSeconds(scheduledAt.getSeconds() + 30);

  return {
    id: drawId,
    prizeId: randomPrize.id,
    prize: randomPrize,
    scheduledAt: scheduledAt.toISOString(),
    status: 'scheduled',
    totalTickets: Math.floor(Math.random() * 1000) + 500,
  };
};

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
  moveToNextDraw: () => void;
  addWin: (prizeId: string, drawId: string, ticketId: string, userId: string) => void;
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

  moveToNextDraw: () => {
    set(state => {
      // Get upcoming draws sorted by scheduledAt
      const sortedUpcoming = [...state.upcomingDraws].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

      // Find the next draw (excluding current)
      let nextDraw = sortedUpcoming.find(
        draw => draw.id !== state.currentDraw?.id,
      );

      // Move current draw to completed
      const updatedCompleted = state.currentDraw
        ? [...state.completedDraws, {...state.currentDraw, status: 'completed' as const}]
        : state.completedDraws;

      // Remove the new current draw from upcoming
      let updatedUpcoming = sortedUpcoming.filter(
        draw => draw.id !== nextDraw?.id && draw.id !== state.currentDraw?.id,
      );

      // Se non ci sono più draw disponibili, ne genera uno nuovo dinamicamente
      if (!nextDraw && state.prizes.length > 0) {
        const existingIds = [
          ...state.completedDraws.map(d => d.id),
          ...state.upcomingDraws.map(d => d.id),
          state.currentDraw?.id,
        ].filter(Boolean) as string[];

        nextDraw = generateNextDraw(state.prizes, existingIds);
        // Aggiungi anche alcuni draw futuri per avere sempre una coda
        const futureDraw1 = generateNextDraw(state.prizes, [...existingIds, nextDraw.id]);
        const futureDraw2 = generateNextDraw(state.prizes, [...existingIds, nextDraw.id, futureDraw1.id]);

        // Aggiusta le date dei draw futuri
        const futureDate1 = new Date();
        futureDate1.setSeconds(futureDate1.getSeconds() + 60);
        futureDraw1.scheduledAt = futureDate1.toISOString();

        const futureDate2 = new Date();
        futureDate2.setSeconds(futureDate2.getSeconds() + 90);
        futureDraw2.scheduledAt = futureDate2.toISOString();

        updatedUpcoming = [futureDraw1, futureDraw2];
      }

      return {
        currentDraw: nextDraw || null,
        upcomingDraws: updatedUpcoming,
        completedDraws: updatedCompleted,
      };
    });
  },

  addWin: (prizeId: string, drawId: string, ticketId: string, userId: string) => {
    set(state => {
      // Find the prize to include in the winner record
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
}));
