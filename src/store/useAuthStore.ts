import {create} from 'zustand';
import {Platform} from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {User} from '../types';
import {mockCurrentUser} from '../services/mock';

// Configure Google Sign-In
GoogleSignin.configure({
  // Web client ID from Google Cloud Console
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  // iOS client ID (required for iOS)
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true,
});

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
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

  loginWithGoogle: async () => {
    set({isLoading: true});

    try {
      // Check if Google Play Services are available (Android only)
      await GoogleSignin.hasPlayServices();

      // Initiate Google Sign-In
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const {data} = response;
        const googleUser = data.user;

        // Create user from Google data
        const newUser: User = {
          ...mockCurrentUser,
          id: `google_${googleUser.id}`,
          email: googleUser.email,
          displayName: googleUser.name || googleUser.email.split('@')[0],
          avatarUrl: googleUser.photo || undefined,
          createdAt: new Date().toISOString(),
        };

        set({
          user: newUser,
          token: data.idToken || 'google_token',
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({isLoading: false});
        throw new Error('Login con Google annullato');
      }
    } catch (error: any) {
      set({isLoading: false});

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            throw new Error('Login già in corso');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services non disponibile');
          default:
            throw new Error('Errore durante il login con Google');
        }
      }
      throw error;
    }
  },

  loginWithApple: async () => {
    set({isLoading: true});

    try {
      // Apple Sign-In is only available on iOS
      if (Platform.OS !== 'ios') {
        set({isLoading: false});
        throw new Error('Apple Sign-In disponibile solo su iOS');
      }

      // For Apple Sign-In, we need to use @invertase/react-native-apple-authentication
      // For now, we'll use a mock implementation
      // In production, install: npm install @invertase/react-native-apple-authentication

      // Simulate Apple Sign-In
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

      const newUser: User = {
        ...mockCurrentUser,
        id: `apple_${Date.now()}`,
        email: 'apple.user@privaterelay.appleid.com',
        displayName: 'Utente Apple',
        createdAt: new Date().toISOString(),
      };

      set({
        user: newUser,
        token: 'apple_token_' + Date.now(),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({isLoading: false});
      throw error;
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
