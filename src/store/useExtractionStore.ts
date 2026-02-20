import {create} from 'zustand';
import {ExtractionResult} from './useTicketsStore';
import {useSettingsStore} from './useSettingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import {useAuthStore} from './useAuthStore';
import {useTicketsStore} from './useTicketsStore';
import {usePrizesStore} from './usePrizesStore';
const SEEN_DRAW_IDS_KEY = 'rafflemania_seen_draw_ids';

export interface MissedExtraction {
  drawId: string;
  prizeId: string;
  prizeName: string;
  prizeImage?: string;
  winningNumber: number;
  userNumbers: number[];
  isWinner: boolean;
  extractedAt: string;
}

interface ExtractionState {
  // State
  showExtractionEffect: boolean;
  showResultModal: boolean;
  extractionResult: ExtractionResult | null;
  isExtractionInProgress: boolean;

  // Missed extractions
  missedExtractions: MissedExtraction[];
  currentMissedIndex: number;
  showMissedModal: boolean;

  // Actions
  startExtraction: () => void;
  showResult: (result: ExtractionResult) => void;
  hideResult: () => void;
  reset: () => void;

  // Missed extraction actions
  fetchMissedExtractions: () => Promise<void>;
  dismissMissedExtraction: () => void;
}

export const useExtractionStore = create<ExtractionState>((set, get) => ({
  showExtractionEffect: false,
  showResultModal: false,
  extractionResult: null,
  isExtractionInProgress: false,

  // Missed extractions
  missedExtractions: [],
  currentMissedIndex: 0,
  showMissedModal: false,

  startExtraction: () => {
    set({
      showExtractionEffect: true,
      isExtractionInProgress: true,
    });
  },

  showResult: (result: ExtractionResult) => {
    // Check if win notifications are enabled
    const {notifications} = useSettingsStore.getState();
    const shouldShowModal = notifications.winNotifications;

    // If user won but has disabled win notifications, don't show modal
    // But always show for losing (so they know the result)
    const showModal = result.isWinner ? shouldShowModal : true;

    if (!showModal) {
      console.log('[Extraction] Win notification suppressed - user disabled in settings');
    }

    set({
      showExtractionEffect: false,
      showResultModal: showModal,
      extractionResult: result,
      isExtractionInProgress: false,
    });
  },

  hideResult: () => {
    set({
      showResultModal: false,
      extractionResult: null,
    });
  },

  reset: () => {
    set({
      showExtractionEffect: false,
      showResultModal: false,
      extractionResult: null,
      isExtractionInProgress: false,
    });
  },

  fetchMissedExtractions: async () => {
    const state = get();
    if (state.showMissedModal || state.showResultModal) {
      console.log('[MissedExtraction] Skipping - modal already visible');
      return;
    }

    const authStore = useAuthStore.getState();
    const user = authStore.user;
    const token = authStore.token;

    if (!token || token.startsWith('guest_token_') || !user?.id) {
      console.log('[MissedExtraction] Skipping - no auth');
      return;
    }

    try {
      // Get seen draw IDs
      const seenStr = await AsyncStorage.getItem(SEEN_DRAW_IDS_KEY);
      const seenIds: string[] = seenStr ? JSON.parse(seenStr) : [];
      const seenSet = new Set(seenIds);

      // Fetch recent draws
      const drawsResponse = await apiClient.get('/draws?limit=10');
      const draws = drawsResponse.data?.data?.draws || [];

      console.log(`[MissedExtraction] ${draws.length} draws, ${seenIds.length} seen IDs`);

      if (draws.length === 0) {
        return;
      }

      // On FIRST RUN: mark all draws EXCEPT the very latest one as seen.
      // The latest draw might be from the current session (just extracted).
      if (seenIds.length === 0 && draws.length > 1) {
        // Mark all except the first (most recent) as seen
        for (let i = 1; i < draws.length; i++) {
          seenSet.add(String(draws[i].id));
        }
        console.log(`[MissedExtraction] First run: marked ${draws.length - 1} old draws as seen, keeping latest (${draws[0].id})`);
      }

      // Filter unseen completed draws
      const newDraws = draws.filter((draw: any) =>
        !seenSet.has(String(draw.id)) && draw.status === 'completed',
      );

      console.log(`[MissedExtraction] ${newDraws.length} unseen draws: ${newDraws.map((d: any) => d.id).join(',')}`);

      if (newDraws.length === 0) {
        return;
      }

      // Check user's result for each unseen draw
      const missed: MissedExtraction[] = [];
      const newSeenIds: string[] = [];

      for (const draw of newDraws) {
        newSeenIds.push(String(draw.id));

        try {
          const checkResponse = await apiClient.get(`/draws/${draw.id}/check-result`);
          const checkData = checkResponse.data?.data;
          if (checkData) {
            const userNumbers = (checkData.userNumbers || []).map((n: any) => Number(n));
            const isWinner = checkData.isWinner === true;
            console.log(`[MissedExtraction] Draw ${draw.id}: ${userNumbers.length} tickets, winner=${isWinner}`);

            if (userNumbers.length > 0) {
              missed.push({
                drawId: String(draw.id),
                prizeId: String(draw.prizeId),
                prizeName: draw.prizeName || 'Premio',
                prizeImage: draw.prizeImage || undefined,
                winningNumber: draw.winningNumber,
                userNumbers,
                isWinner,
                extractedAt: draw.extractedAt || draw.createdAt,
              });
            }
          }
        } catch (e) {
          console.log(`[MissedExtraction] check-result error for draw ${draw.id}:`, e);
        }
      }

      // Save all new draw IDs as seen
      const updatedSeenIds = [...newSeenIds, ...Array.from(seenSet)].slice(0, 50);
      await AsyncStorage.setItem(SEEN_DRAW_IDS_KEY, JSON.stringify(updatedSeenIds));

      if (missed.length > 0) {
        // Update ticket store for winning missed extractions
        const wins = missed.filter(m => m.isWinner);
        if (wins.length > 0) {
          try {
            const {activeTickets, pastTickets} = useTicketsStore.getState();
            const now = new Date().toISOString();
            let updatedActive = [...activeTickets];
            let updatedPast = [...pastTickets];

            for (const win of wins) {
              // Find user's tickets for this prize and move to past
              const prizeTickets = updatedActive.filter(t => String(t.prizeId) === String(win.prizeId));
              if (prizeTickets.length > 0) {
                const movedTickets = prizeTickets.map(ticket => ({
                  ...ticket,
                  isWinner: ticket.ticketNumber === win.winningNumber,
                  wonAt: ticket.ticketNumber === win.winningNumber ? now : undefined,
                  prizeName: ticket.ticketNumber === win.winningNumber ? win.prizeName : undefined,
                  prizeImage: ticket.ticketNumber === win.winningNumber ? win.prizeImage : undefined,
                }));
                updatedActive = updatedActive.filter(t => String(t.prizeId) !== String(win.prizeId));
                updatedPast = [...movedTickets, ...updatedPast];
              } else {
                // No local tickets found - check if already in past
                const alreadyInPast = updatedPast.some(t => String(t.prizeId) === String(win.prizeId) && t.isWinner);
                if (!alreadyInPast) {
                  // Create a synthetic winning ticket entry so MyWins screen shows it
                  updatedPast.unshift({
                    id: `missed_win_${win.drawId}`,
                    ticketNumber: win.winningNumber,
                    userId: user?.id || '',
                    drawId: win.drawId,
                    prizeId: win.prizeId,
                    source: 'ad' as const,
                    isWinner: true,
                    wonAt: win.extractedAt || now,
                    prizeName: win.prizeName,
                    prizeImage: win.prizeImage,
                    createdAt: win.extractedAt || now,
                  });
                }
              }
            }

            useTicketsStore.setState({
              activeTickets: updatedActive,
              pastTickets: updatedPast,
            });
            console.log(`[MissedExtraction] Updated ticket store for ${wins.length} wins`);

            // Force refresh tickets from API to get full data (prize_name from SQL JOIN)
            setTimeout(() => {
              useTicketsStore.getState().forceRefreshTickets();
            }, 2000);

            // Also refresh myWins from server
            if (user?.id) {
              usePrizesStore.getState().fetchMyWins(user.id);
            }
          } catch (e) {
            console.log('[MissedExtraction] Error updating ticket store:', e);
          }
        }

        set({
          missedExtractions: missed,
          currentMissedIndex: 0,
          showMissedModal: true,
        });
      }
    } catch (error: any) {
      console.log('[MissedExtraction] Error:', error);
    }
  },

  dismissMissedExtraction: () => {
    const state = get();
    const nextIndex = state.currentMissedIndex + 1;

    if (nextIndex < state.missedExtractions.length) {
      // Show next missed extraction
      set({currentMissedIndex: nextIndex});
    } else {
      // All done - close modal
      set({
        showMissedModal: false,
        missedExtractions: [],
        currentMissedIndex: 0,
      });
    }
  },
}));
