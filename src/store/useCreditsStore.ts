import {create} from 'zustand';
import {Transaction, CreditPackage} from '../types';
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

export const useCreditsStore = create<CreditsState>((set, get) => ({
  packages: [],
  transactions: [],
  isLoading: false,
  isPurchasing: false,

  fetchPackages: async () => {
    set({isLoading: true});
    await new Promise(resolve => setTimeout(resolve, 500));
    set({
      packages: mockCreditPackages,
      isLoading: false,
    });
  },

  fetchTransactions: async () => {
    set({isLoading: true});
    await new Promise(resolve => setTimeout(resolve, 500));
    set({
      transactions: getUserTransactions('user_001'),
      isLoading: false,
    });
  },

  purchaseCredits: async (packageId: string) => {
    set({isPurchasing: true});

    // Simulate IAP purchase
    await new Promise(resolve => setTimeout(resolve, 2000));

    const creditPackage = get().packages.find(p => p.id === packageId);
    if (!creditPackage) {
      set({isPurchasing: false});
      return false;
    }

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
  },

  useCreditsForTicket: async () => {
    const authStore = useAuthStore.getState();
    if (!authStore.user || authStore.user.credits < CREDITS_PER_TICKET) {
      return false;
    }

    // Deduct credits
    authStore.updateUser({
      credits: authStore.user.credits - CREDITS_PER_TICKET,
    });

    // Add spend transaction
    const newTransaction: Transaction = {
      id: `trans_${Date.now()}`,
      userId: 'user_001',
      type: 'spend',
      credits: -CREDITS_PER_TICKET,
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      transactions: [newTransaction, ...state.transactions],
    }));

    return true;
  },
}));
