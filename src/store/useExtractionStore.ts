import {create} from 'zustand';
import {ExtractionResult} from './useTicketsStore';
import {useSettingsStore} from './useSettingsStore';

interface ExtractionState {
  // State
  showExtractionEffect: boolean;
  showResultModal: boolean;
  extractionResult: ExtractionResult | null;
  isExtractionInProgress: boolean;

  // Actions
  startExtraction: () => void;
  showResult: (result: ExtractionResult) => void;
  hideResult: () => void;
  reset: () => void;
}

export const useExtractionStore = create<ExtractionState>((set, _get) => ({
  showExtractionEffect: false,
  showResultModal: false,
  extractionResult: null,
  isExtractionInProgress: false,

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
}));
