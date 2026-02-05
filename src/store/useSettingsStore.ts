import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import axios from 'axios';

// Base URL for direct PHP endpoints (bypasses REST API cache)
const DIRECT_SETTINGS_URL = 'https://www.rafflemania.it/wp-content/plugins/rafflemania-api/get-settings.php';
const AJAX_SETTINGS_URL = 'https://www.rafflemania.it/wp-admin/admin-ajax.php';

// Default XP rewards - Sistema definitivo
// WATCH_AD = 3 XP per pubblicità
// PURCHASE_TICKET = 2 XP per biglietto acquistato
const DEFAULT_XP_REWARDS = {
  WATCH_AD: 3,           // Guardare pubblicità = 3 XP
  PURCHASE_TICKET: 2,    // Acquistare biglietto = 2 XP
  // Legacy values (kept for compatibility)
  SKIP_AD: 0,
  PURCHASE_CREDITS: 0,
  WIN_PRIZE: 0,
  REFERRAL: 0,
  DAILY_STREAK: 0,
  CREDIT_TICKET: 2,      // Alias per PURCHASE_TICKET
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

// Notification preferences
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  drawReminders: boolean;
  winNotifications: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  drawReminders: true,
  winNotifications: true,
};

interface SettingsState {
  xpRewards: XPRewards;
  credits: CreditsSettings;
  notifications: NotificationPreferences;
  isLoaded: boolean;
  lastFetched: number | null;

  // Actions
  fetchSettings: () => Promise<void>;
  getXPReward: (type: keyof XPRewards) => number;
  setNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  getNotificationPreferences: () => NotificationPreferences;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      xpRewards: DEFAULT_XP_REWARDS,
      credits: DEFAULT_CREDITS,
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
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

      setNotificationPreference: async (key: keyof NotificationPreferences, value: boolean) => {
        // Import OneSignal dynamically to avoid circular dependencies
        const {OneSignal} = await import('react-native-onesignal');

        // Handle push notifications - control OneSignal subscription
        if (key === 'pushEnabled') {
          try {
            if (value) {
              OneSignal.User.pushSubscription.optIn();
              console.log('[Settings] Push notifications enabled');
            } else {
              OneSignal.User.pushSubscription.optOut();
              console.log('[Settings] Push notifications disabled');
            }
          } catch (error) {
            console.error('[Settings] Error toggling push notifications:', error);
          }
        }

        // Handle email preference - sync to backend
        if (key === 'emailEnabled') {
          try {
            // Get user ID from auth store
            const {useAuthStore} = await import('./useAuthStore');
            const user = useAuthStore.getState().user;
            const token = useAuthStore.getState().token;
            const isGuest = token?.startsWith('guest_token_');

            if (user && !isGuest) {
              // Sync email preference to WordPress backend
              await apiClient.post('/users/preferences', {
                email_notifications: value,
              });
              console.log('[Settings] Email preference synced to backend:', value);
            }
          } catch (error) {
            console.log('[Settings] Email sync failed (non-critical):', error);
          }
        }

        // Handle draw reminders - control OneSignal tags for targeted notifications
        if (key === 'drawReminders') {
          try {
            if (value) {
              OneSignal.User.addTag('draw_reminders', 'enabled');
            } else {
              OneSignal.User.removeTag('draw_reminders');
            }
            console.log('[Settings] Draw reminders tag updated:', value);
          } catch (error) {
            console.log('[Settings] Draw reminders tag update failed:', error);
          }
        }

        // Handle win notifications - control OneSignal tags
        if (key === 'winNotifications') {
          try {
            if (value) {
              OneSignal.User.addTag('win_notifications', 'enabled');
            } else {
              OneSignal.User.removeTag('win_notifications');
            }
            console.log('[Settings] Win notifications tag updated:', value);
          } catch (error) {
            console.log('[Settings] Win notifications tag update failed:', error);
          }
        }

        // Update state
        set(state => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        }));

        console.log(`[Settings] ${key} set to ${value}`);
      },

      getNotificationPreferences: () => {
        return get().notifications;
      },
    }),
    {
      name: 'rafflemania-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        xpRewards: state.xpRewards,
        credits: state.credits,
        notifications: state.notifications,
        lastFetched: state.lastFetched,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.isLoaded = true;
            // Ensure notifications has all required fields (for existing users upgrading)
            if (!state.notifications) {
              state.notifications = DEFAULT_NOTIFICATION_PREFERENCES;
            } else {
              state.notifications = {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...state.notifications,
              };
            }
          }
        };
      },
    }
  )
);

// Export a function to get XP rewards that can be used instead of the old XP_REWARDS constant
export const getXPRewards = () => useSettingsStore.getState().xpRewards;
