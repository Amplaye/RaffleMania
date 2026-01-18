import {create} from 'zustand';
import {Ticket} from '../types';
import {
  mockUserTickets,
  mockPastTickets,
  createMockTicket,
} from '../services/mock';

// Probability bonus per ticket (0.5% = 0.005)
export const TICKET_PROBABILITY_BONUS = 0.005;

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;

  // Actions
  fetchTickets: () => Promise<void>;
  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => Ticket;
  incrementAdsWatched: () => void;
  canWatchAd: () => boolean;
  // Ticket probability system
  getTicketsForPrize: (prizeId: string) => number;
  getWinProbabilityForPrize: (prizeId: string) => number;
  getPrimaryTicketForPrize: (prizeId: string) => Ticket | undefined;
  hasPrimaryTicketForPrize: (prizeId: string) => boolean;
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  activeTickets: [],
  pastTickets: [],
  isLoading: false,
  todayAdsWatched: 0,

  fetchTickets: async () => {
    set({isLoading: true});

    // Simulate API call
    await new Promise<void>(resolve => setTimeout(() => resolve(), 800));

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
    // No limit on ads - users can watch unlimited ads
    return true;
  },

  getTicketsForPrize: (prizeId: string) => {
    const {activeTickets} = get();
    return activeTickets.filter(ticket => ticket.prizeId === prizeId).length;
  },

  getWinProbabilityForPrize: (prizeId: string) => {
    const ticketCount = get().getTicketsForPrize(prizeId);
    // Each ticket gives +0.5% win probability bonus
    // No cap - unlimited probability accumulation
    const probability = ticketCount * TICKET_PROBABILITY_BONUS;
    return probability;
  },

  getPrimaryTicketForPrize: (prizeId: string) => {
    const {activeTickets} = get();
    return activeTickets.find(
      ticket => ticket.prizeId === prizeId && ticket.isPrimaryTicket,
    );
  },

  hasPrimaryTicketForPrize: (prizeId: string) => {
    const {activeTickets} = get();
    return activeTickets.some(
      ticket => ticket.prizeId === prizeId && ticket.isPrimaryTicket,
    );
  },
}));
