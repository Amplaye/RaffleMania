import {create} from 'zustand';
import {Platform} from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {User} from '../types';
import {API_CONFIG} from '../utils/constants';
import apiClient, {tokenManager, getErrorMessage} from '../services/apiClient';

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
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

// Helper to map API user to app User type
const mapApiUserToUser = (apiUser: any): User => ({
  id: String(apiUser.id),
  email: apiUser.email,
  displayName: apiUser.username,
  avatarColor: apiUser.avatar_color || '#FF6B00',
  avatarUrl: apiUser.avatar_url || undefined,
  credits: apiUser.credits || 0,
  xp: apiUser.xp || 0,
  level: apiUser.level || 1,
  totalTickets: apiUser.total_tickets || 0,
  watchedAdsCount: apiUser.watched_ads || 0,
  currentStreak: apiUser.current_streak || 0,
  lastStreakDate: apiUser.last_streak_date || undefined,
  referralCode: apiUser.referral_code || '',
  referredBy: apiUser.referred_by || undefined,
  createdAt: apiUser.created_at,
  shippingAddress: apiUser.shipping_address || undefined,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        // Mock login for testing
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
        const mockUser: User = {
          id: '1',
          email,
          displayName: email.split('@')[0],
          avatarColor: '#FF6B00',
          credits: 100,
          xp: 500,
          level: 3,
          totalTickets: 10,
          watchedAdsCount: 25,
          currentStreak: 5,
          referralCode: 'TEST123',
          createdAt: new Date().toISOString(),
        };
        set({
          user: mockUser,
          token: 'mock_token',
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      const response = await apiClient.post('/auth/login', {email, password});
      const {user, tokens} = response.data.data;

      await tokenManager.setTokens(tokens.access_token, tokens.refresh_token);

      set({
        user: mapApiUserToUser(user),
        token: tokens.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({isLoading: false});
      throw new Error(getErrorMessage(error));
    }
  },

  loginWithGoogle: async () => {
    set({isLoading: true});

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const {data} = response;
        const googleUser = data.user;

        if (API_CONFIG.USE_MOCK_DATA) {
          const mockUser: User = {
            id: `google_${googleUser.id}`,
            email: googleUser.email,
            displayName: googleUser.name || googleUser.email.split('@')[0],
            avatarUrl: googleUser.photo || undefined,
            avatarColor: '#FF6B00',
            credits: 0,
            xp: 0,
            level: 1,
            totalTickets: 0,
            watchedAdsCount: 0,
            currentStreak: 0,
            referralCode: 'GOOGLE' + Date.now().toString(36).toUpperCase(),
            createdAt: new Date().toISOString(),
          };
          set({
            user: mockUser,
            token: data.idToken || 'google_token',
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        // Send Google token to backend for verification/registration
        const apiResponse = await apiClient.post('/auth/google', {
          id_token: data.idToken,
          email: googleUser.email,
          name: googleUser.name,
          photo: googleUser.photo,
        });

        const {user, tokens} = apiResponse.data.data;
        await tokenManager.setTokens(tokens.access_token, tokens.refresh_token);

        set({
          user: mapApiUserToUser(user),
          token: tokens.access_token,
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
            throw new Error('Login gia in corso');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services non disponibile');
          default:
            throw new Error('Errore durante il login con Google');
        }
      }
      throw new Error(getErrorMessage(error));
    }
  },

  loginWithApple: async () => {
    set({isLoading: true});

    try {
      if (Platform.OS !== 'ios') {
        set({isLoading: false});
        throw new Error('Apple Sign-In disponibile solo su iOS');
      }

      // TODO: Implement Apple Sign-In with @invertase/react-native-apple-authentication
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

      const mockUser: User = {
        id: `apple_${Date.now()}`,
        email: 'apple.user@privaterelay.appleid.com',
        displayName: 'Utente Apple',
        avatarColor: '#FF6B00',
        credits: 0,
        xp: 0,
        level: 1,
        totalTickets: 0,
        watchedAdsCount: 0,
        currentStreak: 0,
        referralCode: 'APPLE' + Date.now().toString(36).toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      set({
        user: mockUser,
        token: 'apple_token_' + Date.now(),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({isLoading: false});
      throw error;
    }
  },

  register: async (email: string, password: string, username: string) => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
        const mockUser: User = {
          id: `user_${Date.now()}`,
          email,
          displayName: username,
          avatarColor: '#FF6B00',
          credits: 0,
          xp: 0,
          level: 1,
          totalTickets: 0,
          watchedAdsCount: 0,
          currentStreak: 0,
          referralCode: username.substring(0, 4).toUpperCase() + Date.now().toString(36).toUpperCase().substring(0, 4),
          createdAt: new Date().toISOString(),
        };
        set({
          user: mockUser,
          token: 'mock_jwt_token_new',
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      const response = await apiClient.post('/auth/register', {
        email,
        password,
        username,
      });

      const {user, tokens} = response.data.data;
      await tokenManager.setTokens(tokens.access_token, tokens.refresh_token);

      set({
        user: mapApiUserToUser(user),
        token: tokens.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({isLoading: false});
      throw new Error(getErrorMessage(error));
    }
  },

  logout: async () => {
    try {
      if (!API_CONFIG.USE_MOCK_DATA) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
      await tokenManager.clearTokens();
      await GoogleSignin.signOut().catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      const token = await tokenManager.getAccessToken();
      if (!token) {
        set({isAuthenticated: false, user: null, token: null});
        return;
      }

      if (API_CONFIG.USE_MOCK_DATA) {
        set({isAuthenticated: true, token});
        return;
      }

      const response = await apiClient.get('/auth/verify');
      if (response.data.success) {
        set({
          user: mapApiUserToUser(response.data.data.user),
          token,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      await tokenManager.clearTokens();
      set({isAuthenticated: false, user: null, token: null});
    }
  },

  refreshUserData: async () => {
    try {
      if (API_CONFIG.USE_MOCK_DATA) return;

      const response = await apiClient.get('/users/me');
      if (response.data.success) {
        set({user: mapApiUserToUser(response.data.data.user)});
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
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
