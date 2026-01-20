import {create} from 'zustand';
import {Ticket} from '../types';
import {
  mockUserTickets,
  mockPastTickets,
  getNextTicketNumber,
  getTotalPoolTickets,
} from '../services/mock';

export interface ExtractionResult {
  isWinner: boolean;
  winningNumber?: number;
  userNumbers?: number[];
  prizeId?: string;
  prizeName?: string;
  prizeImage?: string;
}

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;
  isInitialized: boolean;

  // Actions
  fetchTickets: () => Promise<void>;
  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => Ticket;
  incrementAdsWatched: () => void;
  canWatchAd: () => boolean;

  // Ticket system - numeri progressivi
  getTicketsForPrize: (prizeId: string) => Ticket[];
  getTicketNumbersForPrize: (prizeId: string) => number[];
  getTicketCountForPrize: (prizeId: string) => number;

  // Extraction - sistema "pentolone"
  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
  forceWinExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  activeTickets: [],
  pastTickets: [],
  isLoading: false,
  todayAdsWatched: 0,
  isInitialized: false,

  fetchTickets: async () => {
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
    // Ottieni il prossimo numero globale per questo premio
    const ticketNumber = getNextTicketNumber(prizeId);

    const newTicket: Ticket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticketNumber,
      userId: 'user_001',
      drawId,
      prizeId,
      source,
      isWinner: false,
      createdAt: new Date().toISOString(),
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
    return true;
  },

  getTicketsForPrize: (prizeId: string) => {
    const {activeTickets} = get();
    return activeTickets.filter(ticket => ticket.prizeId === prizeId);
  },

  getTicketNumbersForPrize: (prizeId: string) => {
    const tickets = get().getTicketsForPrize(prizeId);
    return tickets.map(t => t.ticketNumber).sort((a, b) => a - b);
  },

  getTicketCountForPrize: (prizeId: string) => {
    return get().getTicketsForPrize(prizeId).length;
  },

  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => {
    const {activeTickets, pastTickets} = get();

    // Ottieni i biglietti dell'utente per questo premio
    const userTickets = activeTickets.filter(t => t.prizeId === prizeId);
    const userNumbers = userTickets.map(t => t.ticketNumber);

    if (userNumbers.length === 0) {
      return {isWinner: false};
    }

    // Ottieni il totale dei biglietti nel "pentolone" per questo premio
    const totalPoolTickets = getTotalPoolTickets(prizeId);

    // Estrai un numero casuale dal pentolone (1 a totalPoolTickets)
    const winningNumber = Math.floor(Math.random() * totalPoolTickets) + 1;

    // Verifica se l'utente ha il numero vincente
    const isWinner = userNumbers.includes(winningNumber);

    // Trova il biglietto vincente (se l'utente ha vinto)
    const winningTicket = isWinner
      ? userTickets.find(t => t.ticketNumber === winningNumber)
      : undefined;

    // Sposta i biglietti da attivi a passati
    const now = new Date().toISOString();
    const updatedUserTickets = userTickets.map(ticket => ({
      ...ticket,
      isWinner: ticket.ticketNumber === winningNumber,
      wonAt: ticket.ticketNumber === winningNumber ? now : undefined,
      prizeName: ticket.ticketNumber === winningNumber ? prizeName : undefined,
      prizeImage: ticket.ticketNumber === winningNumber ? prizeImage : undefined,
    }));

    // Rimuovi i biglietti di questo premio dagli attivi
    const remainingActiveTickets = activeTickets.filter(t => t.prizeId !== prizeId);

    // Aggiungi ai biglietti passati
    const newPastTickets = [...updatedUserTickets, ...pastTickets];

    set({
      activeTickets: remainingActiveTickets,
      pastTickets: newPastTickets,
    });

    return {
      isWinner,
      winningNumber,
      userNumbers,
      prizeId,
      prizeName,
      prizeImage,
    };
  },

  forceWinExtraction: (prizeId: string, prizeName: string, prizeImage: string) => {
    const {activeTickets, pastTickets} = get();

    // Ottieni i biglietti dell'utente per questo premio
    const userTickets = activeTickets.filter(t => t.prizeId === prizeId);
    const userNumbers = userTickets.map(t => t.ticketNumber);

    if (userNumbers.length === 0) {
      return {isWinner: false};
    }

    // Forza la vincita usando il primo numero dell'utente
    const winningNumber = userNumbers[0];
    const now = new Date().toISOString();

    // Sposta i biglietti da attivi a passati, marcando il primo come vincente
    const updatedUserTickets = userTickets.map(ticket => ({
      ...ticket,
      isWinner: ticket.ticketNumber === winningNumber,
      wonAt: ticket.ticketNumber === winningNumber ? now : undefined,
      prizeName: ticket.ticketNumber === winningNumber ? prizeName : undefined,
      prizeImage: ticket.ticketNumber === winningNumber ? prizeImage : undefined,
    }));

    // Rimuovi i biglietti di questo premio dagli attivi
    const remainingActiveTickets = activeTickets.filter(t => t.prizeId !== prizeId);

    // Aggiungi ai biglietti passati
    const newPastTickets = [...updatedUserTickets, ...pastTickets];

    set({
      activeTickets: remainingActiveTickets,
      pastTickets: newPastTickets,
    });

    return {
      isWinner: true,
      winningNumber,
      userNumbers,
      prizeId,
      prizeName,
      prizeImage,
    };
  },
}));
