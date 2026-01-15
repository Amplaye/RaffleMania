import {create} from 'zustand';
import {Ticket} from '../types';
import {
  mockUserTickets,
  mockPastTickets,
  createMockTicket,
} from '../services/mock';

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;
  maxAdsPerDay: number;

  // Actions
  fetchTickets: () => Promise<void>;
  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => Ticket;
  incrementAdsWatched: () => void;
  canWatchAd: () => boolean;
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  activeTickets: [],
  pastTickets: [],
  isLoading: false,
  todayAdsWatched: 0,
  maxAdsPerDay: 10,

  fetchTickets: async () => {
    set({isLoading: true});

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    set({
      activeTickets: mockUserTickets,
      pastTickets: mockPastTickets,
      isLoading: false,
    });
  },

  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => {
    const newTicket = createMockTicket(source, drawId, prizeId);

    set(state => ({
      activeTickets: [newTicket, ...state.activeTickets],
    }));

    return newTicket;
  },

  incrementAdsWatched: () => {
    set(state => ({
      todayAdsWatched: state.todayAdsWatched + 1,
    }));
  },

  canWatchAd: () => {
    const state = get();
    return state.todayAdsWatched < state.maxAdsPerDay;
  },
}));
