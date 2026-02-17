import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Transaction, CreditPackage} from '../types';
import {API_CONFIG} from '../utils/constants';
import apiClient, {getErrorMessage} from '../services/apiClient';
import {mockCreditPackages, getUserTransactions} from '../services/mock';
import {useAuthStore} from './useAuthStore';

interface CreditsState {
  packages: CreditPackage[];
  transactions: Transaction[];
  isLoading: boolean;
  isPurchasing: boolean;

  // Actions
  fetchPackages: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  purchaseCredits: (packageId: string) => Promise<boolean>;
  useCreditsForTicket: () => Promise<boolean>;
  useCreditsForTickets: (quantity: number) => boolean;
  addCredits: (amount: number, source: 'level_up' | 'streak' | 'referral' | 'purchase' | 'other') => void;
}

const CREDITS_PER_TICKET = 1;

// Map API transaction to app Transaction type
const mapApiTransactionToTransaction = (apiTrans: any): Transaction => ({
  id: String(apiTrans.id),
  userId: String(apiTrans.user_id),
  type: apiTrans.type,
  credits: apiTrans.amount,
  amount: apiTrans.amount,
  description: apiTrans.description,
  createdAt: apiTrans.created_at,
});

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
  packages: [],
  transactions: [],
  isLoading: false,
  isPurchasing: false,

  fetchPackages: async () => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({packages: mockCreditPackages, isLoading: false});
        return;
      }

      // In production, packages might come from a settings endpoint or be hardcoded
      // For now, use mock packages but could fetch from /settings or similar
      set({packages: mockCreditPackages, isLoading: false});
    } catch (error) {
      console.error('Error fetching packages:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  fetchTransactions: async () => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        set({transactions: getUserTransactions('user_001'), isLoading: false});
        return;
      }

      const response = await apiClient.get('/users/me/credits');
      const transactions = response.data.data.transactions.map(mapApiTransactionToTransaction);
      set({transactions, isLoading: false});
    } catch (error) {
      console.error('Error fetching transactions:', getErrorMessage(error));
      set({isLoading: false});
    }
  },

  purchaseCredits: async (_packageId: string) => {
    // Purchases are now handled directly in ShopScreen via paymentService
    // Credits are awarded server-side after payment verification
    // This method is kept for backward compatibility but should not be used directly
    console.log('[CreditsStore] purchaseCredits called - use ShopScreen payment flow instead');
    return false;
  },

  useCreditsForTicket: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return false;
    }

    // Check if guest user - use local credits only
    const isGuestUser = authStore.token?.startsWith('guest_token_');

    if (isGuestUser || API_CONFIG.USE_MOCK_DATA) {
      // Local mode: check local credits
      if (authStore.user.credits < CREDITS_PER_TICKET) {
        return false;
      }
      // Deduct credits locally
      authStore.updateUser({
        credits: authStore.user.credits - CREDITS_PER_TICKET,
      });
      return true;
    }

    // For authenticated users, use local credits directly (no backend refresh to speed up)
    // Backend will validate and deduct during ticket creation
    const currentUser = authStore.user;
    if (!currentUser || currentUser.credits < CREDITS_PER_TICKET) {
      return false;
    }

    // Optimistically deduct credits locally for immediate feedback
    authStore.updateUser({
      credits: currentUser.credits - CREDITS_PER_TICKET,
    });

    return true;
  },

  // Deduct credits for multiple tickets at once (synchronous, no flickering)
  useCreditsForTickets: (quantity: number) => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return false;
    }

    const totalCreditsNeeded = quantity * CREDITS_PER_TICKET;
    if (authStore.user.credits < totalCreditsNeeded) {
      return false;
    }

    // Deduct all credits at once
    authStore.updateUser({
      credits: authStore.user.credits - totalCreditsNeeded,
    });

    return true;
  },

  addCredits: (amount: number, source: 'level_up' | 'streak' | 'referral' | 'purchase' | 'other') => {
    const authStore = useAuthStore.getState();
    if (!authStore.user) {
      return;
    }

    // Update user credits
    authStore.updateUser({
      credits: authStore.user.credits + amount,
    });

    // Add transaction record
    const sourceDescriptions: Record<string, string> = {
      level_up: 'Premio livello',
      streak: 'Bonus streak',
      referral: 'Bonus referral',
      purchase: 'Acquisto crediti',
      other: 'Crediti bonus',
    };

    const newTransaction: Transaction = {
      id: `trans_${Date.now()}`,
      userId: authStore.user.id || 'user_001',
      type: 'bonus',
      credits: amount,
      amount: 0,
      description: sourceDescriptions[source],
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      transactions: [newTransaction, ...state.transactions],
    }));

    console.log(`Crediti aggiunti: +${amount} (${sourceDescriptions[source]})`);
  },
}),
    {
      name: 'rafflemania-credits-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
      }),
    }
  )
);
