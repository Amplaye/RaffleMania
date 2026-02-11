import {create} from 'zustand';
import {ExtractionResult} from './useTicketsStore';
import {useSettingsStore} from './useSettingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import {useAuthStore} from './useAuthStore';

const LAST_SEEN_DRAW_KEY = 'rafflemania_last_seen_draw_timestamp';

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
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    const token = authStore.token;

    if (!token || token.startsWith('guest_token_') || !user?.id) {
      return;
    }

    try {
      // Get last seen timestamp
      const lastSeenStr = await AsyncStorage.getItem(LAST_SEEN_DRAW_KEY);
      const lastSeenTimestamp = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;

      // Fetch recent draws from server
      const drawsResponse = await apiClient.get('/draws?limit=10');
      const draws = drawsResponse.data?.data?.draws || [];

      if (draws.length === 0) {
        return;
      }

      // Filter draws that happened after last seen timestamp
      const newDraws = draws.filter((draw: any) => {
        const drawTime = new Date(draw.extractedAt || draw.createdAt).getTime();
        return drawTime > lastSeenTimestamp && draw.status === 'completed';
      });

      if (newDraws.length === 0) {
        return;
      }

      console.log(`[Extraction] Found ${newDraws.length} missed extractions`);

      // For each missed draw, get user's tickets for that prize
      const missed: MissedExtraction[] = [];

      for (const draw of newDraws) {
        const prizeId = draw.prizeId;
        const winningNumber = draw.winningNumber;
        let userNumbers: number[] = [];

        // Try to get user's ticket numbers for this prize
        try {
          const ticketsResponse = await apiClient.get(`/tickets/prize/${prizeId}`);
          const nums = ticketsResponse.data?.data?.numbers || [];
          userNumbers = nums.map((n: any) => Number(n));
        } catch {
          console.log(`[Extraction] Could not fetch tickets for prize ${prizeId}`);
        }

        const isWinner = userNumbers.includes(winningNumber);

        // Show to all users who had tickets, or if they won
        if (userNumbers.length > 0) {
          missed.push({
            drawId: String(draw.id),
            prizeId: String(prizeId),
            prizeName: draw.prizeName || 'Premio',
            prizeImage: draw.prizeImage || undefined,
            winningNumber,
            userNumbers,
            isWinner,
            extractedAt: draw.extractedAt || draw.createdAt,
          });
        }
      }

      if (missed.length > 0) {
        set({
          missedExtractions: missed,
          currentMissedIndex: 0,
          showMissedModal: true,
        });
      }

      // Update last seen timestamp to the most recent draw
      const mostRecentDraw = draws[0];
      const mostRecentTime = mostRecentDraw.extractedAt || mostRecentDraw.createdAt;
      await AsyncStorage.setItem(LAST_SEEN_DRAW_KEY, mostRecentTime);
    } catch (error) {
      console.log('[Extraction] Error fetching missed extractions:', error);
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
