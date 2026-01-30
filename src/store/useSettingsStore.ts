import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import axios from 'axios';

// Base URL for direct PHP endpoints (bypasses REST API cache)
const DIRECT_SETTINGS_URL = 'https://www.craftytraders.com/wp-content/plugins/rafflemania-api/get-settings.php';
const AJAX_SETTINGS_URL = 'https://www.craftytraders.com/wp-admin/admin-ajax.php';

// Default XP rewards - these values should match backend settings
// They act as fallback if API fails due to caching
const DEFAULT_XP_REWARDS = {
  WATCH_AD: 10,
  SKIP_AD: 20,
  PURCHASE_CREDITS: 25,
  WIN_PRIZE: 250,
  REFERRAL: 50,
  DAILY_STREAK: 10,
  CREDIT_TICKET: 20, // Updated to match backend setting
};

// Default credits settings
const DEFAULT_CREDITS = {
  PER_TICKET: 5,
  REFERRAL_BONUS: 10,
};

interface XPRewards {
  WATCH_AD: number;
  SKIP_AD: number;
  PURCHASE_CREDITS: number;
  WIN_PRIZE: number;
  REFERRAL: number;
  DAILY_STREAK: number;
  CREDIT_TICKET: number;
}

interface CreditsSettings {
  PER_TICKET: number;
  REFERRAL_BONUS: number;
}

interface SettingsState {
  xpRewards: XPRewards;
  credits: CreditsSettings;
  isLoaded: boolean;
  lastFetched: number | null;

  // Actions
  fetchSettings: () => Promise<void>;
  getXPReward: (type: keyof XPRewards) => number;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      xpRewards: DEFAULT_XP_REWARDS,
      credits: DEFAULT_CREDITS,
      isLoaded: false,
      lastFetched: null,

      fetchSettings: async () => {
        // Helper function to apply settings
        const applySettings = (xp: any, credits: any, source: string) => {
          set({
            xpRewards: {
              WATCH_AD: xp?.watch_ad ?? DEFAULT_XP_REWARDS.WATCH_AD,
              SKIP_AD: xp?.skip_ad ?? DEFAULT_XP_REWARDS.SKIP_AD,
              PURCHASE_CREDITS: xp?.purchase_credits ?? DEFAULT_XP_REWARDS.PURCHASE_CREDITS,
              WIN_PRIZE: xp?.win_prize ?? DEFAULT_XP_REWARDS.WIN_PRIZE,
              REFERRAL: xp?.referral ?? DEFAULT_XP_REWARDS.REFERRAL,
              DAILY_STREAK: xp?.daily_streak ?? DEFAULT_XP_REWARDS.DAILY_STREAK,
              CREDIT_TICKET: xp?.credit_ticket ?? DEFAULT_XP_REWARDS.CREDIT_TICKET,
            },
            credits: {
              PER_TICKET: credits?.per_ticket ?? DEFAULT_CREDITS.PER_TICKET,
              REFERRAL_BONUS: credits?.referral_bonus ?? DEFAULT_CREDITS.REFERRAL_BONUS,
            },
            isLoaded: true,
            lastFetched: Date.now(),
          });
          console.log(`Settings loaded from ${source}:`, get().xpRewards);
        };

        // Method 1: Try direct PHP endpoint (bypasses REST API cache)
        try {
          console.log('Trying direct PHP settings endpoint...');
          const response = await axios.get(DIRECT_SETTINGS_URL, {
            timeout: 5000,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });

          if (response.data?.success && response.data?.data) {
            const {xp, credits} = response.data.data;
            applySettings(xp, credits, 'direct PHP endpoint');
            return;
          }
        } catch (error) {
          console.log('Direct PHP endpoint failed:', error);
        }

        // Method 2: Try AJAX endpoint (also bypasses REST cache)
        try {
          console.log('Trying AJAX settings endpoint...');
          const formData = new FormData();
          formData.append('action', 'rafflemania_get_settings');

          const response = await axios.post(AJAX_SETTINGS_URL, formData, {
            timeout: 5000,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data?.success && response.data?.data) {
            const {xp, credits} = response.data.data;
            applySettings(xp, credits, 'AJAX endpoint');
            return;
          }
        } catch (error) {
          console.log('AJAX endpoint failed:', error);
        }

        // Method 3: Try REST API /settings endpoint
        try {
          console.log('Trying REST API /settings endpoint...');
          const response = await apiClient.get('/settings');

          if (response.data?.success && response.data?.data) {
            const {xp, credits} = response.data.data;
            applySettings(xp, credits, '/settings REST API');
            return;
          }
        } catch {
          console.log('REST /settings endpoint not available');
        }

        // Method 4: Fallback to /prizes response
        try {
          console.log('Trying /prizes fallback...');
          const prizesResponse = await apiClient.get('/prizes');
          const settingsData = prizesResponse.data?.data?.settings;

          if (settingsData) {
            applySettings(settingsData.xp, settingsData.credits, '/prizes fallback');
            return;
          }
        } catch {
          console.log('Prizes fallback also failed');
        }

        // Keep defaults on error
        console.log('Using default settings - all methods failed');
        set({isLoaded: true});
      },

      getXPReward: (type: keyof XPRewards) => {
        return get().xpRewards[type] ?? DEFAULT_XP_REWARDS[type];
      },
    }),
    {
      name: 'rafflemania-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        xpRewards: state.xpRewards,
        credits: state.credits,
        lastFetched: state.lastFetched,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.isLoaded = true;
          }
        };
      },
    }
  )
);

// Export a function to get XP rewards that can be used instead of the old XP_REWARDS constant
export const getXPRewards = () => useSettingsStore.getState().xpRewards;
