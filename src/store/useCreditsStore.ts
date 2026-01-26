import {create} from 'zustand';
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
}

const CREDITS_PER_TICKET = 5;

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

export const useCreditsStore = create<CreditsState>((set, get) => ({
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

  purchaseCredits: async (packageId: string) => {
    set({isPurchasing: true});

    try {
      const creditPackage = get().packages.find(p => p.id === packageId);
      if (!creditPackage) {
        set({isPurchasing: false});
        return false;
      }

      if (API_CONFIG.USE_MOCK_DATA) {
        // Simulate IAP purchase
        await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

        // Update user credits
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          authStore.updateUser({
            credits: authStore.user.credits + creditPackage.credits,
          });
        }

        // Add transaction
        const newTransaction: Transaction = {
          id: `trans_${Date.now()}`,
          userId: 'user_001',
          type: 'purchase',
          credits: creditPackage.credits,
          amount: creditPackage.price,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          transactions: [newTransaction, ...state.transactions],
          isPurchasing: false,
        }));

        return true;
      }

      // Real API call - In production, this would involve IAP verification
      const response = await apiClient.post('/users/me/credits/purchase', {
        package_id: packageId,
        // receipt: iapReceipt // From in-app purchase
      });

      if (response.data.success) {
        // Refresh user data to get updated credits
        const authStore = useAuthStore.getState();
        await authStore.refreshUserData();

        // Refresh transactions
        await get().fetchTransactions();

        set({isPurchasing: false});
        return true;
      }

      set({isPurchasing: false});
      return false;
    } catch (error) {
      console.error('Error purchasing credits:', getErrorMessage(error));
      set({isPurchasing: false});
      return false;
    }
  },

  useCreditsForTicket: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user || authStore.user.credits < CREDITS_PER_TICKET) {
      return false;
    }

    try {
      if (!API_CONFIG.USE_MOCK_DATA) {
        // API will handle credit deduction when creating ticket with source='credits'
        // Just update local state optimistically
      }

      // Deduct credits locally
      authStore.updateUser({
        credits: authStore.user.credits - CREDITS_PER_TICKET,
      });

      // Add spend transaction locally
      const newTransaction: Transaction = {
        id: `trans_${Date.now()}`,
        userId: authStore.user.id,
        type: 'spend',
        credits: -CREDITS_PER_TICKET,
        createdAt: new Date().toISOString(),
      };

      set(state => ({
        transactions: [newTransaction, ...state.transactions],
      }));

      return true;
    } catch (error) {
      console.error('Error using credits:', getErrorMessage(error));
      return false;
    }
  },
}));
