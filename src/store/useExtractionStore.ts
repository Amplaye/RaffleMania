import {create} from 'zustand';
import {ExtractionResult} from './useTicketsStore';

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
    set({
      showExtractionEffect: false,
      showResultModal: true,
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
