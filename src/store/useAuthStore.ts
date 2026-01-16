import {create} from 'zustand';
import {User} from '../types';
import {mockCurrentUser} from '../services/mock';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, _password: string) => {
    set({isLoading: true});

    // Simulate API call
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));

    // Mock login - in production this would call the WordPress API
    if (email) {
      set({
        user: mockCurrentUser,
        token: 'mock_jwt_token_123',
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({isLoading: false});
      throw new Error('Credenziali non valide');
    }
  },

  register: async (email: string, _password: string, displayName: string) => {
    set({isLoading: true});

    // Simulate API call
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

    // Mock registration
    const newUser: User = {
      ...mockCurrentUser,
      id: `user_${Date.now()}`,
      email,
      displayName,
      credits: 0,
      totalTickets: 0,
      watchedAdsCount: 0,
      referralCode: `RAF${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      shippingAddress: undefined,
    };

    set({
      user: newUser,
      token: 'mock_jwt_token_new',
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {...currentUser, ...userData},
      });
    }
  },

  setLoading: (loading: boolean) => {
    set({isLoading: loading});
  },
}));
