import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ticket} from '../types';
import {API_CONFIG} from '../utils/constants';

console.log('useTicketsStore: MODULE LOADED');
import apiClient, {getErrorMessage} from '../services/apiClient';
import {
  mockUserTickets,
  mockPastTickets,
  getTotalPoolTickets,
} from '../services/mock';
import {
  requestTickets,
  generateDrawId,
  getTotalAssignedForDraw,
  getAllAssignedNumbersForDraw,
  resetDrawRegistry,
} from '../services/ticketNumberService';

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

import {useGameConfigStore, DEFAULT_DAILY_LIMITS} from './useGameConfigStore';

// Limiti giornalieri - Fallback defaults (dynamic values from useGameConfigStore)
export const DAILY_LIMITS = DEFAULT_DAILY_LIMITS;

// Dynamic daily limits helper
const getDynamicDailyLimits = () => {
  try {
    return useGameConfigStore.getState().getDailyLimits();
  } catch {
    return DAILY_LIMITS;
  }
};

interface TicketsState {
  activeTickets: Ticket[];
  pastTickets: Ticket[];
  isLoading: boolean;
  todayAdsWatched: number;
  todayTicketsPurchased: number;  // Biglietti acquistati oggi
  lastAdWatchedAt: string | null; // Timestamp ultima ad
  lastResetDate: string | null;   // Data ultimo reset (per reset a mezzanotte)
  isInitialized: boolean;

  // Actions
  fetchTickets: () => Promise<void>;
  addTicket: (source: 'ad' | 'credits', drawId: string, prizeId: string) => Promise<Ticket>;
  // NEW: Acquisto batch atomico con numeri univoci garantiti
  addTicketsBatch: (
    source: 'ad' | 'credits',
    prizeId: string,
    timerStartedAt: string | undefined,
    quantity: number
  ) => Promise<Ticket[]>;
  incrementAdsWatched: () => void;
  canWatchAd: () => boolean;
  canPurchaseTicket: () => boolean;
  getTicketsPurchasedToday: () => number;
  getAdCooldownRemaining: () => number; // Minuti rimanenti
  getAdCooldownSeconds: () => number; // Secondi rimanenti per countdown
  checkAndResetDaily: () => void;
  resetDailyLimit: () => void; // Debug: reset limite giornaliero

  // Ticket system - numeri progressivi
  getTicketsForPrize: (prizeId: string) => Ticket[];
  getTicketNumbersForPrize: (prizeId: string) => number[];
  getTicketCountForPrize: (prizeId: string) => number;
  // NEW: Ottiene il totale dei biglietti per un draw specifico
  getTotalTicketsForDraw: (prizeId: string, timerStartedAt?: string) => number;

  // Extraction - sistema "pentolone"
  simulateExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
  forceWinExtraction: (prizeId: string, prizeName: string, prizeImage: string) => ExtractionResult;
  checkDrawResult: (drawId: string, prizeId: string, prizeName: string, prizeImage: string) => Promise<ExtractionResult>;
  syncExtractionToBackend: (prizeId: string, winningNumber: number, userTicketId?: string) => Promise<void>;

  // Pulizia biglietti per nuovo round
  clearTicketsForPrize: (prizeId: string) => void;

  // Cleanup: rimuovi ticket attivi per premi già estratti
  cleanupExtractedTickets: () => Promise<void>;
}

export const useTicketsStore = create<TicketsState>()(
  persist(
    (set, get) => ({
  activeTickets: [],
  pastTickets: [],
  isLoading: false,
  todayAdsWatched: 0,
  todayTicketsPurchased: 0,
  lastAdWatchedAt: null,
  lastResetDate: null,
  isInitialized: false,

  fetchTickets: async () => {
    const {isInitialized, pastTickets: localPastTickets, activeTickets: localActiveTickets} = get();
    if (isInitialized) {
      return;
    }

    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
        // Preserve local winning tickets when using mock data
        const localWinners = localPastTickets.filter(t => t.isWinner);
        set({
          activeTickets: mockUserTickets,
          pastTickets: [...localWinners, ...mockPastTickets.filter(t => !localWinners.some(w => w.id === t.id))],
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      const response = await apiClient.get('/tickets');
      const tickets = response.data.data.tickets.map(mapApiTicketToTicket);

      // Separa biglietti attivi e passati
      const apiActiveTickets = tickets.filter((t: Ticket) => !t.isWinner && !t.wonAt);
      const apiPastTickets = tickets.filter((t: Ticket) => t.isWinner || t.wonAt);

      // Merge API data with local winning tickets (local wins take priority)
      const localWinners = localPastTickets.filter(t => t.isWinner);
      const mergedPastTickets = [
        ...localWinners,
        ...apiPastTickets.filter((t: Ticket) => !localWinners.some(w => w.id === t.id || w.prizeId === t.prizeId)),
      ];

      set({
        activeTickets: apiActiveTickets.length > 0 ? apiActiveTickets : localActiveTickets,
        pastTickets: mergedPastTickets,
        isLoading: false,
        isInitialized: true,
      });

      // Cleanup tickets for prizes that have already been extracted
      await get().cleanupExtractedTickets();
    } catch {
      // API failed - KEEP local data, don't reset!
      console.log('Tickets API not available, preserving local data');
      set({
        isLoading: false,
        isInitialized: true,
        // Keep activeTickets and pastTickets as they are (persisted from AsyncStorage)
      });

      // Still cleanup even with local data
      await get().cleanupExtractedTickets();
    }
  },

  addTicket: async (source: 'ad' | 'credits', drawId: string, prizeId: string) => {
    // Usa addTicketsBatch con quantity=1 per garantire unicità
    // Estrai timerStartedAt dal drawId se possibile
    const {usePrizesStore} = await import('./usePrizesStore');
    const prize = usePrizesStore.getState().prizes.find(p => p.id === prizeId);
    const timerStartedAt = prize?.timerStartedAt;

    const tickets = await get().addTicketsBatch(source, prizeId, timerStartedAt, 1);
    return tickets[0];
  },

  // NEW: Acquisto batch atomico con numeri univoci garantiti
  addTicketsBatch: async (
    source: 'ad' | 'credits',
    prizeId: string,
    timerStartedAt: string | undefined,
    quantity: number
  ) => {
    // Check daily reset first
    get().checkAndResetDaily();

    // Check if user can purchase more tickets today
    const currentPurchased = get().todayTicketsPurchased;
    const remainingToday = getDynamicDailyLimits().MAX_TICKETS_PER_DAY - currentPurchased;

    if (remainingToday <= 0) {
      throw new Error('Hai raggiunto il limite di 60 biglietti giornalieri. Riprova domani!');
    }

    // Limita la quantità al numero rimanente
    const actualQuantity = Math.min(quantity, remainingToday);

    // Import auth store to check if user is guest
    const {useAuthStore} = await import('./useAuthStore');
    const user = useAuthStore.getState().user;
    const updateUser = useAuthStore.getState().updateUser;
    const userId = user?.id || 'user_001';

    console.log(`[TicketsStore] Requesting ${actualQuantity} tickets for prize ${prizeId}`);

    // Usa il nuovo servizio per ottenere numeri univoci
    const assignments = await requestTickets(
      prizeId,
      timerStartedAt,
      actualQuantity,
      source,
      userId
    );

    // Converti le assegnazioni in Ticket objects
    const newTickets: Ticket[] = assignments.map(assignment => ({
      id: assignment.ticketId,
      ticketNumber: assignment.ticketNumber,
      userId,
      drawId: assignment.drawId,
      prizeId: assignment.prizeId,
      source: assignment.source,
      isWinner: false,
      createdAt: assignment.createdAt,
    }));

    // Aggiorna lo state in un'unica operazione atomica
    set(state => ({
      activeTickets: [...newTickets, ...state.activeTickets],
      todayTicketsPurchased: state.todayTicketsPurchased + actualQuantity,
    }));

    // Update local user stats for ad-based tickets
    if (source === 'ad' && user) {
      updateUser({
        watchedAdsCount: (user.watchedAdsCount || 0) + actualQuantity,
      });
    }

    console.log(`[TicketsStore] Successfully created ${actualQuantity} tickets with numbers:`,
      newTickets.map(t => t.ticketNumber));

    return newTickets;
  },

  incrementAdsWatched: () => {
    const now = new Date().toISOString();
    set(state => ({
      todayAdsWatched: state.todayAdsWatched + 1,
      lastAdWatchedAt: now,
    }));
  },

  checkAndResetDaily: () => {
    const today = new Date().toISOString().split('T')[0];
    const state = get();

    if (state.lastResetDate !== today) {
      // È un nuovo giorno - reset contatori
      // Usa setTimeout per evitare setState durante render
      setTimeout(() => {
        set({
          todayAdsWatched: 0,
          todayTicketsPurchased: 0,
          lastResetDate: today,
        });
      }, 0);
    }
  },

  canWatchAd: () => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = state.lastResetDate !== today;

    // Se è un nuovo giorno, i contatori verranno resettati - per ora considera come se fossero a 0
    const effectiveAdsWatched = isNewDay ? 0 : state.todayAdsWatched;

    // Check limite ads giornaliere
    if (effectiveAdsWatched >= getDynamicDailyLimits().MAX_ADS_PER_DAY) {
      return false;
    }

    // Check cooldown 20 minuti (solo se non è un nuovo giorno)
    if (!isNewDay && state.lastAdWatchedAt) {
      const lastWatched = new Date(state.lastAdWatchedAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastWatched.getTime()) / (1000 * 60);
      if (diffMinutes < getDynamicDailyLimits().AD_COOLDOWN_MINUTES) {
        return false;
      }
    }

    return true;
  },

  canPurchaseTicket: () => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = state.lastResetDate !== today;
    const effectiveTickets = isNewDay ? 0 : state.todayTicketsPurchased;
    return effectiveTickets < getDynamicDailyLimits().MAX_TICKETS_PER_DAY;
  },

  getTicketsPurchasedToday: () => {
    const state = get();
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = state.lastResetDate !== today;
    return isNewDay ? 0 : state.todayTicketsPurchased;
  },

  getAdCooldownRemaining: () => {
    const state = get();
    if (!state.lastAdWatchedAt) return 0;

    const lastWatched = new Date(state.lastAdWatchedAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastWatched.getTime()) / (1000 * 60);
    const remaining = getDynamicDailyLimits().AD_COOLDOWN_MINUTES - diffMinutes;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  },

  getAdCooldownSeconds: () => {
    const state = get();
    if (!state.lastAdWatchedAt) return 0;

    const lastWatched = new Date(state.lastAdWatchedAt);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastWatched.getTime()) / 1000;
    const cooldownSeconds = getDynamicDailyLimits().AD_COOLDOWN_MINUTES * 60;
    const remaining = cooldownSeconds - diffSeconds;
    return remaining > 0 ? Math.ceil(remaining) : 0;
  },

  // Debug: reset daily ticket limit
  resetDailyLimit: () => {
    set({
      todayTicketsPurchased: 0,
      todayAdsWatched: 0,
      lastAdWatchedAt: null,
    });
    console.log('DEBUG: Daily limit reset');
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

  // Ottiene il totale dei biglietti assegnati per un draw specifico
  getTotalTicketsForDraw: (prizeId: string, timerStartedAt?: string) => {
    const drawId = generateDrawId(prizeId, timerStartedAt);
    return getTotalAssignedForDraw(drawId);
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

    // Ottieni il drawId dai biglietti dell'utente (se esistono)
    const drawId = userTickets.length > 0 ? userTickets[0].drawId : undefined;

    // Ottieni tutti i numeri realmente assegnati per questo draw
    // Il vincitore DEVE essere un numero che esiste nel pool
    let allAssignedNumbers: number[] = [];
    if (drawId) {
      allAssignedNumbers = getAllAssignedNumbersForDraw(drawId);
    }

    // Fallback: se il registry locale è vuoto (es. utente autenticato con biglietti da API),
    // costruisci il pool dai biglietti attivi dell'utente + un range simulato
    if (allAssignedNumbers.length === 0) {
      const totalPool = getTotalPoolTickets(prizeId);
      // Genera numeri sequenziali 1..totalPool come pool di biglietti esistenti
      for (let i = 1; i <= totalPool; i++) {
        allAssignedNumbers.push(i);
      }
    }

    console.log(`[Extraction] Draw ${drawId}, pool size: ${allAssignedNumbers.length}, user numbers:`, userNumbers);

    // Seleziona il vincitore SOLO tra i numeri realmente esistenti
    const winningNumber = allAssignedNumbers[Math.floor(Math.random() * allAssignedNumbers.length)];

    if (userNumbers.length === 0) {
      // L'utente non ha biglietti, perde automaticamente ma mostra comunque il numero vincente
      return {
        isWinner: false,
        winningNumber,
        userNumbers: [],
        prizeId,
        prizeName,
        prizeImage,
      };
    }

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

    console.log('simulateExtraction: moving tickets to past', {
      userTicketsCount: updatedUserTickets.length,
      newPastTicketsCount: newPastTickets.length,
      winnersInNewPast: newPastTickets.filter(t => t.isWinner).length,
      isWinner,
      winningNumber,
    });

    set({
      activeTickets: remainingActiveTickets,
      pastTickets: newPastTickets,
    });

    // Verify state was updated
    const updatedState = get();
    console.log('simulateExtraction: state after set', {
      activeTicketsNow: updatedState.activeTickets.length,
      pastTicketsNow: updatedState.pastTickets.length,
      winnersNow: updatedState.pastTickets.filter(t => t.isWinner).length,
    });

    // Update local user winsCount if user won
    if (isWinner) {
      // Import dynamically to avoid circular dependency
      import('./useAuthStore').then(({useAuthStore}) => {
        const user = useAuthStore.getState().user;
        const updateUser = useAuthStore.getState().updateUser;
        if (user) {
          updateUser({
            winsCount: (user.winsCount || 0) + 1,
          });
        }
      });
    }

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

    console.log('forceWinExtraction: moving tickets to past', {
      userTicketsCount: updatedUserTickets.length,
      newPastTicketsCount: newPastTickets.length,
      winnersInNewPast: newPastTickets.filter(t => t.isWinner).length,
      winningNumber,
    });

    set({
      activeTickets: remainingActiveTickets,
      pastTickets: newPastTickets,
    });

    // Verify state was updated
    const updatedState = get();
    console.log('forceWinExtraction: state after set', {
      activeTicketsNow: updatedState.activeTickets.length,
      pastTicketsNow: updatedState.pastTickets.length,
      winnersNow: updatedState.pastTickets.filter(t => t.isWinner).length,
    });

    // Update local user winsCount (forceWin always wins)
    import('./useAuthStore').then(({useAuthStore}) => {
      const user = useAuthStore.getState().user;
      const updateUser = useAuthStore.getState().updateUser;
      if (user) {
        updateUser({
          winsCount: (user.winsCount || 0) + 1,
        });
      }
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
    const {usePrizesStore} = await import('./usePrizesStore');
    const token = useAuthStore.getState().token;
    const isGuestUser = token?.startsWith('guest_token_');

    // Skip sync for guests or mock data mode
    if (API_CONFIG.USE_MOCK_DATA || isGuestUser) {
      return;
    }

    // Get prize info to include timer_started_at
    const prize = usePrizesStore.getState().prizes.find(p => p.id === prizeId);
    const timerStartedAt = prize?.timerStartedAt;

    try {
      const payload: any = {
        prize_id: parseInt(prizeId, 10),
        winning_number: winningNumber,
        user_ticket_id: userTicketId,
      };

      // Include timer_started_at as fallback for backend
      if (timerStartedAt) {
        payload.timer_started_at = timerStartedAt;
      }

      console.log('Syncing draw to backend:', payload);
      await apiClient.post('/draws', payload);
      console.log('Draw synced successfully');
    } catch (error) {
      console.log('Draw sync to backend failed (non-critical):', getErrorMessage(error));
    }

    // Also track stats separately (ensures stats are always tracked)
    // Using public test endpoint to bypass auth issues
    try {
      const isWinner = !!userTicketId;
      await apiClient.post('/draws/track-stats-test', {
        is_winner: isWinner,
      });
    } catch (error) {
      console.log('Stats tracking failed (non-critical):', getErrorMessage(error));
    }
  },

  clearTicketsForPrize: (prizeId: string) => {
    const {activeTickets} = get();
    // Ottieni il drawId prima di cancellare per resettare anche il registry locale
    const prizeTickets = activeTickets.filter(t => t.prizeId === prizeId);
    if (prizeTickets.length > 0) {
      const drawId = prizeTickets[0].drawId;
      if (drawId) {
        resetDrawRegistry(drawId);
      }
    }
    // Rimuovi tutti i biglietti attivi per questo premio
    set({
      activeTickets: activeTickets.filter(t => t.prizeId !== prizeId),
    });
    console.log(`[TicketsStore] Cleared all active tickets for prize ${prizeId}`);
  },

  cleanupExtractedTickets: async () => {
    try {
      const {usePrizesStore} = await import('./usePrizesStore');
      const {completedDraws} = usePrizesStore.getState();
      const {activeTickets, pastTickets} = get();

      if (activeTickets.length === 0 && pastTickets.length === 0) return;

      // Raccogli tutti i prizeId che hanno draws completati
      const extractedPrizeIds = new Set<string>();
      completedDraws.forEach(draw => {
        if (draw.status === 'completed' && draw.prizeId) {
          extractedPrizeIds.add(String(draw.prizeId));
        }
      });

      // Anche controlla i premi con timerStatus 'completed' o extractedAt
      const {prizes} = usePrizesStore.getState();
      prizes.forEach(prize => {
        if (prize.extractedAt || prize.timerStatus === 'completed') {
          extractedPrizeIds.add(String(prize.id));
        }
      });

      if (extractedPrizeIds.size === 0) return;

      // Filtra i ticket attivi: rimuovi quelli per premi già estratti
      const cleanedActiveTickets = activeTickets.filter(t => !extractedPrizeIds.has(String(t.prizeId)));
      const removedActive = activeTickets.length - cleanedActiveTickets.length;

      // Pulisci pastTickets: mantieni SOLO i ticket vincenti
      const cleanedPastTickets = pastTickets.filter(t => t.isWinner);
      const removedPast = pastTickets.length - cleanedPastTickets.length;

      if (removedActive > 0 || removedPast > 0) {
        set({
          activeTickets: cleanedActiveTickets,
          pastTickets: cleanedPastTickets,
        });
        console.log(`[TicketsStore] Cleanup: removed ${removedActive} active tickets for extracted prizes, ${removedPast} non-winning past tickets`);
      }
    } catch (error) {
      console.log('[TicketsStore] Cleanup error:', error);
    }
  },
}),
    {
      name: 'rafflemania-tickets-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const winnersCount = state.pastTickets.filter(t => t.isWinner).length;
        console.log('Tickets persist: saving', {
          activeTickets: state.activeTickets.length,
          pastTickets: state.pastTickets.length,
          winners: winnersCount,
        });
        return {
          activeTickets: state.activeTickets,
          pastTickets: state.pastTickets,
          todayAdsWatched: state.todayAdsWatched,
          todayTicketsPurchased: state.todayTicketsPurchased,
          lastAdWatchedAt: state.lastAdWatchedAt,
          lastResetDate: state.lastResetDate,
          // DON'T persist isInitialized - it will be set based on rehydrated data
        };
      },
      onRehydrateStorage: () => {
        console.log('Tickets rehydrate: STARTING');
        return (state, error) => {
          console.log('Tickets rehydrate: CALLBACK', {hasState: !!state, hasError: !!error});
          if (error) {
            console.log('Tickets rehydrate: ERROR', error);
            return;
          }
          if (state) {
            const winnersCount = state.pastTickets?.filter(t => t.isWinner).length || 0;
            const hasData = (state.activeTickets?.length || 0) > 0 || (state.pastTickets?.length || 0) > 0;
            console.log('Tickets rehydrate: loaded', {
              activeTickets: state.activeTickets?.length || 0,
              pastTickets: state.pastTickets?.length || 0,
              winners: winnersCount,
              hasData,
            });
            // Mark as initialized if we have rehydrated data
            if (hasData) {
              state.isInitialized = true;
            }
          } else {
            console.log('Tickets rehydrate: NO STATE');
          }
        };
      },
    }
  )
);

// Debug function to check AsyncStorage contents
export const debugTicketsStorage = async () => {
  try {
    const rawData = await AsyncStorage.getItem('rafflemania-tickets-storage');
    console.log('DEBUG AsyncStorage raw:', rawData ? rawData.substring(0, 500) : 'null');
    if (rawData) {
      const parsed = JSON.parse(rawData);
      console.log('DEBUG AsyncStorage parsed:', {
        hasState: !!parsed.state,
        activeTickets: parsed.state?.activeTickets?.length || 0,
        pastTickets: parsed.state?.pastTickets?.length || 0,
        winners: parsed.state?.pastTickets?.filter((t: any) => t.isWinner)?.length || 0,
      });
    }
  } catch (error) {
    console.log('DEBUG AsyncStorage error:', error);
  }
};
