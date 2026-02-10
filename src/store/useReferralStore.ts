import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from './useAuthStore';
import apiClient from '../services/apiClient';

// Referral rewards configuration
export const REFERRAL_REWARDS = {
  DAYS_REQUIRED: 7,          // Days the referred user must be active
  REFERRER_CREDITS: 15,      // Credits for the person who referred
  REFERRED_CREDITS: 15,      // Credits for the person who was referred
};

// Referred user tracking
export interface ReferredUser {
  id: string;
  displayName: string;
  joinedAt: string;          // When they registered
  daysActive: number;        // Days they've been active (0-7)
  lastActiveDate: string | null;  // Last date they were active
  isCompleted: boolean;      // true when 7 days reached
  rewardClaimed: boolean;    // true when referrer got the reward
}

// Referrer info (who referred the current user)
export interface ReferrerInfo {
  id: string;
  displayName: string;
  referralCode: string;
  daysActive: number;        // Current user's progress
  lastActiveDate: string | null;
  isCompleted: boolean;      // true when current user completed 7 days
  rewardClaimed: boolean;    // true when current user got the reward
}

interface ReferralState {
  // Users that the current user has referred
  referredUsers: ReferredUser[];

  // Who referred the current user (if any)
  referrer: ReferrerInfo | null;

  // Loading state
  isLoading: boolean;

  // Hydration state
  _hasHydrated: boolean;

  // Actions
  setHasHydrated: (state: boolean) => void;

  // Fetch referrals from API (returns false if API auth failed)
  // silent = true skips isLoading indicator (used by internal calls)
  fetchReferrals: (silent?: boolean) => Promise<boolean>;

  // Add a new referred user (called when someone uses your code)
  addReferredUser: (user: {id: string; displayName: string}) => void;

  // Set the referrer for current user (called during registration)
  setReferrer: (referrer: {id: string; displayName: string; referralCode: string}) => void;

  // Update daily activity (should be called when user opens app)
  updateDailyActivity: () => Promise<void>;

  // Check and claim rewards
  checkAndClaimRewards: () => Promise<{referrerReward: number; referredReward: number}>;

  // Get stats
  getTotalReferrals: () => number;
  getCompletedReferrals: () => number;
  getTotalCreditsEarned: () => number;
  getPendingReferrals: () => ReferredUser[];

  // Update a specific referred user's progress (for when they login)
  updateReferredUserActivity: (userId: string) => void;

  // Reset (for logout)
  reset: () => void;

  // Simulate a new referral (for testing)
  simulateNewReferral: (name: string) => void;

  // Simulate days passing for a referred user (for testing)
  simulateDaysActive: (userId: string, days: number) => void;
}

// Format date in local timezone (YYYY-MM-DD)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Map API response to ReferredUser
const mapApiReferral = (apiUser: any): ReferredUser => ({
  id: String(apiUser.id || apiUser.user_id),
  displayName: apiUser.username || apiUser.display_name || apiUser.displayName || 'Utente',
  joinedAt: apiUser.joined_at || apiUser.joinedAt || apiUser.created_at || new Date().toISOString(),
  daysActive: apiUser.days_active || apiUser.daysActive || 0,
  lastActiveDate: apiUser.last_active_date || apiUser.lastActiveDate || null,
  isCompleted: apiUser.is_completed || apiUser.isCompleted || (apiUser.days_active || 0) >= REFERRAL_REWARDS.DAYS_REQUIRED,
  rewardClaimed: apiUser.reward_claimed || apiUser.rewardClaimed || false,
});

// Map API response to ReferrerInfo
const mapApiReferrer = (apiReferrer: any): ReferrerInfo => ({
  id: String(apiReferrer.id || apiReferrer.referrer_id),
  displayName: apiReferrer.username || apiReferrer.display_name || apiReferrer.displayName || 'Amico',
  referralCode: apiReferrer.referral_code || apiReferrer.referralCode || '',
  daysActive: apiReferrer.my_days_active || apiReferrer.days_active || apiReferrer.daysActive || 0,
  lastActiveDate: apiReferrer.my_last_active_date || apiReferrer.last_active_date || apiReferrer.lastActiveDate || null,
  isCompleted: apiReferrer.my_is_completed || apiReferrer.is_completed || apiReferrer.isCompleted || false,
  rewardClaimed: apiReferrer.my_reward_claimed || apiReferrer.reward_claimed || apiReferrer.rewardClaimed || false,
});

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      referredUsers: [],
      referrer: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({_hasHydrated: state});
      },

      fetchReferrals: async (silent = false) => {
        const authStore = useAuthStore.getState();
        const user = authStore.user;
        const token = authStore.token;

        // Skip for guest users or if not authenticated
        if (!token || token.startsWith('guest_token_') || !user?.id || !user?.email) {
          console.log('[ReferralStore] Skipping fetch (guest or no user)');
          return false;
        }

        // Auth params as fallback when JWT fails
        const authParams = `user_id=${user.id}&email=${encodeURIComponent(user.email)}`;

        if (!silent) {
          set({isLoading: true});
        }

        try {
          // Fetch my referred users (people who used my code)
          const referralsResponse = await apiClient.get(`/referrals?${authParams}`);
          console.log('[ReferralStore] Fetched referrals:', referralsResponse.data);

          if (referralsResponse.data.success && referralsResponse.data.data) {
            const apiReferrals = referralsResponse.data.data.referrals || referralsResponse.data.data || [];
            const referredUsers = Array.isArray(apiReferrals)
              ? apiReferrals.map(mapApiReferral)
              : [];

            set({referredUsers});
          }
        } catch (error: any) {
          console.log('[ReferralStore] Error fetching referrals:', error.response?.data || error.message);
        }

        try {
          // Fetch who referred me (if anyone)
          const referrerResponse = await apiClient.get(`/referrals/my-referrer?${authParams}`);
          console.log('[ReferralStore] Fetched my referrer:', referrerResponse.data);

          if (referrerResponse.data.success && referrerResponse.data.data) {
            const apiReferrer = referrerResponse.data.data.referrer || referrerResponse.data.data;
            if (apiReferrer && apiReferrer.id) {
              set({referrer: mapApiReferrer(apiReferrer)});
            }
          }
        } catch (error: any) {
          console.log('[ReferralStore] Error fetching my referrer:', error.response?.data || error.message);
        }

        if (!silent) {
          set({isLoading: false});
        }
        return true;
      },

      addReferredUser: (user: {id: string; displayName: string}) => {
        const state = get();
        const today = formatDate(new Date());

        // Check if user already exists
        if (state.referredUsers.some(u => u.id === user.id)) {
          console.log('[ReferralStore] User already referred:', user.id);
          return;
        }

        const newReferredUser: ReferredUser = {
          id: user.id,
          displayName: user.displayName,
          joinedAt: new Date().toISOString(),
          daysActive: 1, // First day counts
          lastActiveDate: today,
          isCompleted: false,
          rewardClaimed: false,
        };

        console.log('[ReferralStore] Adding referred user:', newReferredUser);

        set({
          referredUsers: [...state.referredUsers, newReferredUser],
        });
      },

      setReferrer: (referrer: {id: string; displayName: string; referralCode: string}) => {
        const today = formatDate(new Date());

        const referrerInfo: ReferrerInfo = {
          id: referrer.id,
          displayName: referrer.displayName,
          referralCode: referrer.referralCode,
          daysActive: 1, // First day counts
          lastActiveDate: today,
          isCompleted: false,
          rewardClaimed: false,
        };

        console.log('[ReferralStore] Setting referrer:', referrerInfo);

        set({referrer: referrerInfo});
      },

      updateDailyActivity: async () => {
        const state = get();
        const authStore = useAuthStore.getState();
        const token = authStore.token;
        const user = authStore.user;
        const today = formatDate(new Date());

        // Try to send activity to backend
        if (token && !token.startsWith('guest_token_') && user?.id && user?.email) {
          try {
            await apiClient.post('/referrals/activity', {user_id: user.id, email: user.email});
            console.log('[ReferralStore] Sent daily activity to backend');

            // Refetch to get updated data (silent - no loading indicator)
            await get().fetchReferrals(true);
            return;
          } catch (error: any) {
            console.log('[ReferralStore] Error sending activity:', error.response?.data || error.message);
            // Fall through to local update
          }
        }

        // Local update (fallback or for guests)
        if (state.referrer && !state.referrer.isCompleted) {
          const lastDate = state.referrer.lastActiveDate;

          if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatDate(yesterday);

            let newDaysActive = state.referrer.daysActive;

            if (lastDate === yesterdayStr) {
              newDaysActive = Math.min(state.referrer.daysActive + 1, REFERRAL_REWARDS.DAYS_REQUIRED);
            } else if (lastDate === null) {
              newDaysActive = 1;
            }

            const isCompleted = newDaysActive >= REFERRAL_REWARDS.DAYS_REQUIRED;

            console.log('[ReferralStore] Local activity update:', {
              lastDate,
              today,
              newDaysActive,
              isCompleted,
            });

            set({
              referrer: {
                ...state.referrer,
                daysActive: newDaysActive,
                lastActiveDate: today,
                isCompleted,
              },
            });
          }
        }
      },

      updateReferredUserActivity: (userId: string) => {
        const state = get();
        const today = formatDate(new Date());

        const userIndex = state.referredUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) {
          return;
        }

        const user = state.referredUsers[userIndex];
        if (user.isCompleted) {
          return;
        }

        const lastDate = user.lastActiveDate;

        if (lastDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = formatDate(yesterday);

          let newDaysActive = user.daysActive;

          if (lastDate === yesterdayStr || lastDate === null) {
            newDaysActive = Math.min(user.daysActive + 1, REFERRAL_REWARDS.DAYS_REQUIRED);
          }

          const isCompleted = newDaysActive >= REFERRAL_REWARDS.DAYS_REQUIRED;

          console.log('[ReferralStore] Updating referred user activity:', {
            userId,
            lastDate,
            today,
            newDaysActive,
            isCompleted,
          });

          const updatedUsers = [...state.referredUsers];
          updatedUsers[userIndex] = {
            ...user,
            daysActive: newDaysActive,
            lastActiveDate: today,
            isCompleted,
          };

          set({referredUsers: updatedUsers});
        }
      },

      checkAndClaimRewards: async () => {
        const state = get();
        const authStore = useAuthStore.getState();
        const token = authStore.token;
        const user = authStore.user;
        let referrerReward = 0;
        let referredReward = 0;

        // Try to claim via API first
        if (token && !token.startsWith('guest_token_') && user?.id && user?.email) {
          try {
            const response = await apiClient.post('/referrals/claim', {user_id: user.id, email: user.email});
            console.log('[ReferralStore] Claim rewards response:', response.data);

            if (response.data.success && response.data.data) {
              const claimed = response.data.data;
              referrerReward = claimed.referrer_credits || claimed.referrerCredits || 0;
              referredReward = claimed.referred_credits || claimed.referredCredits || 0;

              // Refetch to get updated state (silent - no loading indicator)
              await get().fetchReferrals(true);

              // Refresh user credits
              if ((referrerReward > 0 || referredReward > 0) && authStore.user) {
                authStore.refreshUserData();
              }

              return {referrerReward, referredReward};
            }
          } catch (error: any) {
            console.log('[ReferralStore] Error claiming rewards:', error.response?.data || error.message);
            // Fall through to local claim
          }
        }

        // Local claim (fallback)
        const updatedUsers = state.referredUsers.map(user => {
          if (user.isCompleted && !user.rewardClaimed) {
            referrerReward += REFERRAL_REWARDS.REFERRER_CREDITS;
            return {...user, rewardClaimed: true};
          }
          return user;
        });

        let updatedReferrer = state.referrer;
        if (state.referrer && state.referrer.isCompleted && !state.referrer.rewardClaimed) {
          referredReward = REFERRAL_REWARDS.REFERRED_CREDITS;
          updatedReferrer = {...state.referrer, rewardClaimed: true};
        }

        const totalReward = referrerReward + referredReward;
        if (totalReward > 0 && authStore.user) {
          console.log('[ReferralStore] Local awarding credits:', {
            referrerReward,
            referredReward,
            total: totalReward,
          });

          authStore.updateUser({
            credits: authStore.user.credits + totalReward,
          });

          set({
            referredUsers: updatedUsers,
            referrer: updatedReferrer,
          });
        }

        return {referrerReward, referredReward};
      },

      getTotalReferrals: () => {
        return get().referredUsers.length;
      },

      getCompletedReferrals: () => {
        return get().referredUsers.filter(u => u.isCompleted).length;
      },

      getTotalCreditsEarned: () => {
        const state = get();
        const fromReferrals = state.referredUsers.filter(u => u.rewardClaimed).length * REFERRAL_REWARDS.REFERRER_CREDITS;
        const fromBeingReferred = state.referrer?.rewardClaimed ? REFERRAL_REWARDS.REFERRED_CREDITS : 0;
        return fromReferrals + fromBeingReferred;
      },

      getPendingReferrals: () => {
        return get().referredUsers.filter(u => !u.isCompleted);
      },

      reset: () => {
        set({
          referredUsers: [],
          referrer: null,
        });
      },

      // Simulate a new referral (for testing)
      simulateNewReferral: (name: string) => {
        const state = get();
        const today = formatDate(new Date());
        const newId = `sim_${Date.now()}`;

        const newReferredUser: ReferredUser = {
          id: newId,
          displayName: name,
          joinedAt: new Date().toISOString(),
          daysActive: 1,
          lastActiveDate: today,
          isCompleted: false,
          rewardClaimed: false,
        };

        console.log('[ReferralStore] Simulating new referral:', newReferredUser);

        set({
          referredUsers: [...state.referredUsers, newReferredUser],
        });
      },

      // Simulate days passing for a referred user (for testing)
      simulateDaysActive: (userId: string, days: number) => {
        const state = get();
        const userIndex = state.referredUsers.findIndex(u => u.id === userId);

        if (userIndex === -1) {
          console.log('[ReferralStore] User not found:', userId);
          return;
        }

        const today = formatDate(new Date());
        const newDaysActive = Math.min(days, REFERRAL_REWARDS.DAYS_REQUIRED);
        const isCompleted = newDaysActive >= REFERRAL_REWARDS.DAYS_REQUIRED;

        console.log('[ReferralStore] Simulating days for user:', {
          userId,
          newDaysActive,
          isCompleted,
        });

        const updatedUsers = [...state.referredUsers];
        updatedUsers[userIndex] = {
          ...updatedUsers[userIndex],
          daysActive: newDaysActive,
          lastActiveDate: today,
          isCompleted,
        };

        set({referredUsers: updatedUsers});
      },
    }),
    {
      name: 'rafflemania-referral-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        referredUsers: state.referredUsers,
        referrer: state.referrer,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
