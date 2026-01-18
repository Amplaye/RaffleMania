import {create} from 'zustand';
import {Ticket} from '../types';
import {
  mockUserTickets,
  mockPastTickets,
} from '../services/mock';
import {generateTicketCode} from '../utils/formatters';

// Probability bonus per ticket (0.5% = 0.005)
export const TICKET_PROBABILITY_BONUS = 0.005;

interface ExtractionResult {
  isWinner: boolean;
  prizeId?: string;
  prizeName?: string;
  prizeImage?: string;
  ticketCode?: string;
}

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;
  isInitialized: boolean; // Track if initial fetch has been done

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
  // Extraction simulation
  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  activeTickets: [],
  pastTickets: [],
  isLoading: false,
  todayAdsWatched: 0,
  isInitialized: false,

  fetchTickets: async () => {
    // Only fetch mock data on first call, preserve state on subsequent calls
    const {isInitialized} = get();
    if (isInitialized) {
      return;
    }

    set({isLoading: true});

    // Simulate API call
    await new Promise<void>(resolve => setTimeout(() => resolve(), 800));

    set({
      activeTickets: mockUserTickets,
      pastTickets: mockPastTickets,
      isLoading: false,
      isInitialized: true,
    });
  },

  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => {
    const {activeTickets} = get();

    // Check if user already has a primary ticket for this prize
    const hasPrimary = activeTickets.some(
      ticket => ticket.prizeId === prizeId && ticket.isPrimaryTicket,
    );

    const newTicket: Ticket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uniqueCode: hasPrimary ? '' : generateTicketCode(),
      userId: 'user_001',
      drawId,
      prizeId,
      source,
      isWinner: false,
      createdAt: new Date().toISOString(),
      isPrimaryTicket: !hasPrimary,
    };

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

  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => {
    const {activeTickets, pastTickets} = get();

    // Get tickets for this prize
    const prizeTickets = activeTickets.filter(t => t.prizeId === prizeId);

    if (prizeTickets.length === 0) {
      // No tickets for this prize, user loses
      return {isWinner: false};
    }

    // Calculate win probability (each ticket = 0.5% chance, capped at 50% for simulation)
    const winProbability = Math.min(prizeTickets.length * TICKET_PROBABILITY_BONUS, 0.5);

    // Random win/lose (for demo, we give 30% chance to win)
    const random = Math.random();
    const isWinner = random < 0.3; // 30% chance to win for demo purposes

    // Get primary ticket
    const primaryTicket = prizeTickets.find(t => t.isPrimaryTicket) || prizeTickets[0];

    // Update tickets - move from active to past
    const now = new Date().toISOString();
    const updatedPrizeTickets = prizeTickets.map(ticket => ({
      ...ticket,
      isWinner: isWinner && ticket.id === primaryTicket.id,
      wonAt: isWinner && ticket.id === primaryTicket.id ? now : undefined,
      // Store prize info for winning tickets display
      prizeName: isWinner && ticket.id === primaryTicket.id ? prizeName : undefined,
      prizeImage: isWinner && ticket.id === primaryTicket.id ? prizeImage : undefined,
    }));

    // Keep other active tickets, remove prize tickets
    const remainingActiveTickets = activeTickets.filter(t => t.prizeId !== prizeId);

    // Add to past tickets
    const newPastTickets = [...updatedPrizeTickets, ...pastTickets];

    set({
      activeTickets: remainingActiveTickets,
      pastTickets: newPastTickets,
    });

    return {
      isWinner,
      prizeId,
      prizeName,
      prizeImage,
      ticketCode: primaryTicket.uniqueCode,
    };
  },
}));

export type {ExtractionResult};
