import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ticket} from '../types';
import {API_CONFIG} from '../utils/constants';
import apiClient, {getErrorMessage} from '../services/apiClient';
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

// Map API ticket to app Ticket type
const mapApiTicketToTicket = (apiTicket: any): Ticket => ({
  id: String(apiTicket.id),
  ticketNumber: apiTicket.ticketNumber || apiTicket.ticket_number,
  userId: String(apiTicket.userId || apiTicket.user_id || ''),
  drawId: apiTicket.drawId || apiTicket.draw_id || '',
  prizeId: String(apiTicket.prizeId || apiTicket.prize_id),
  source: apiTicket.source || 'ad',
  isWinner: apiTicket.isWinner === true || apiTicket.is_winner === 1 || apiTicket.is_winner === true,
  createdAt: apiTicket.createdAt || apiTicket.created_at,
  prizeName: apiTicket.prizeName || apiTicket.prize_name,
  prizeImage: apiTicket.prizeImage || apiTicket.prize_image,
  wonAt: apiTicket.wonAt || apiTicket.won_at,
});

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;
  isInitialized: boolean;

  // Actions
  fetchTickets: () => Promise<void>;
  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => Promise<Ticket>;
  incrementAdsWatched: () => void;
  canWatchAd: () => boolean;

  // Ticket system - numeri progressivi
  getTicketsForPrize: (prizeId: string) => Ticket[];
  getTicketNumbersForPrize: (prizeId: string) => number[];
  getTicketCountForPrize: (prizeId: string) => number;

  // Extraction - sistema "pentolone"
  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
  forceWinExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
  checkDrawResult: (drawId: string, prizeId: string, prizeName: string, prizeImage: string) => Promise<ExtractionResult>;
  syncExtractionToBackend: (prizeId: string, winningNumber: number, userTicketId?: string) => Promise<void>;
}

export const useTicketsStore = create<TicketsState>()(
  persist(
    (set, get) => ({
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

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
        set({
          activeTickets: mockUserTickets,
          pastTickets: mockPastTickets,
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      const response = await apiClient.get('/tickets');
      const tickets = response.data.data.tickets.map(mapApiTicketToTicket);

      // Separa biglietti attivi e passati
      const activeTickets = tickets.filter((t: Ticket) => !t.isWinner && !t.wonAt);
      const pastTickets = tickets.filter((t: Ticket) => t.isWinner || t.wonAt);

      set({
        activeTickets,
        pastTickets,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      // Fallback to mock data if API fails
      console.log('Tickets API not available, using local data');
      set({
        activeTickets: [],
        pastTickets: [],
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  addTicket: async (source: 'ad' | 'credits', drawId: string, prizeId: string) => {
    // Import auth store to check if user is guest
    const {useAuthStore} = await import('./useAuthStore');
    const token = useAuthStore.getState().token;
    const isGuestUser = token?.startsWith('guest_token_');

    // Use local mode for mock data OR guest users
    if (API_CONFIG.USE_MOCK_DATA || isGuestUser) {
      // Local: ottieni il prossimo numero globale per questo premio
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
    }

    try {
      // API call to create ticket (only for authenticated users)
      const response = await apiClient.post('/tickets', {
        prize_id: prizeId,
        source,
      });

      const newTicket = mapApiTicketToTicket(response.data.data.ticket);

      set(state => ({
        activeTickets: [newTicket, ...state.activeTickets],
      }));

      return newTicket;
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      console.error('Error creating ticket:', errorMessage);

      // Don't fallback for credit-related errors - propagate them
      if (errorMessage.toLowerCase().includes('crediti') ||
          errorMessage.toLowerCase().includes('insufficient')) {
        throw new Error(errorMessage);
      }

      // Fallback to local ticket creation only for network/server errors
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
    }
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

  checkDrawResult: async (drawId: string, prizeId: string, prizeName: string, prizeImage: string) => {
    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        // Fallback to local simulation
        return get().simulateExtraction(prizeId, prizeName, prizeImage);
      }

      const response = await apiClient.get(`/draws/${drawId}/check-result`);
      const result = response.data.data;

      const {activeTickets, pastTickets} = get();
      const userTickets = activeTickets.filter(t => t.prizeId === prizeId);

      if (result.is_winner) {
        // Update winning ticket
        const now = new Date().toISOString();
        const updatedUserTickets = userTickets.map(ticket => ({
          ...ticket,
          isWinner: ticket.ticketNumber === result.winning_number,
          wonAt: ticket.ticketNumber === result.winning_number ? now : undefined,
          prizeName: ticket.ticketNumber === result.winning_number ? prizeName : undefined,
          prizeImage: ticket.ticketNumber === result.winning_number ? prizeImage : undefined,
        }));

        const remainingActiveTickets = activeTickets.filter(t => t.prizeId !== prizeId);
        const newPastTickets = [...updatedUserTickets, ...pastTickets];

        set({
          activeTickets: remainingActiveTickets,
          pastTickets: newPastTickets,
        });
      }

      return {
        isWinner: result.is_winner,
        winningNumber: result.winning_number,
        userNumbers: result.user_numbers,
        prizeId,
        prizeName,
        prizeImage,
      };
    } catch (error) {
      console.error('Error checking draw result:', getErrorMessage(error));
      return {isWinner: false};
    }
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

  // Sync extraction to backend (for authenticated users)
  syncExtractionToBackend: async (prizeId: string, winningNumber: number, userTicketId?: string) => {
    // Import auth store to check if user is guest
    const {useAuthStore} = await import('./useAuthStore');
    const token = useAuthStore.getState().token;
    const isGuestUser = token?.startsWith('guest_token_');

    // Skip sync for guests or mock data mode
    if (API_CONFIG.USE_MOCK_DATA || isGuestUser) {
      return;
    }

    try {
      await apiClient.post('/draws', {
        prize_id: parseInt(prizeId, 10),
        winning_number: winningNumber,
        user_ticket_id: userTicketId,
      });
    } catch (error) {
      console.log('Draw sync to backend failed (non-critical):', getErrorMessage(error));
    }
  },
}),
    {
      name: 'rafflemania-tickets-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTickets: state.activeTickets,
        pastTickets: state.pastTickets,
        todayAdsWatched: state.todayAdsWatched,
      }),
    }
  )
);
