import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';

// Hardcoded fallback defaults (same as DB seed values)
export const DEFAULT_LEVELS = [
  {level: 0, name: 'Principiante', minXP: 0, maxXP: 1000, icon: 'leaf', color: '#FF6B00', creditReward: 0},
  {level: 1, name: 'Novizio', minXP: 1000, maxXP: 2200, icon: 'flash', color: '#FF6B00', creditReward: 5},
  {level: 2, name: 'Apprendista', minXP: 2200, maxXP: 3800, icon: 'compass', color: '#FF6B00', creditReward: 10},
  {level: 3, name: 'Esploratore', minXP: 3800, maxXP: 5800, icon: 'map', color: '#FF6B00', creditReward: 20},
  {level: 4, name: 'Avventuriero', minXP: 5800, maxXP: 8300, icon: 'shield', color: '#FF6B00', creditReward: 35},
  {level: 5, name: 'Veterano', minXP: 8300, maxXP: 11500, icon: 'medal', color: '#FF6B00', creditReward: 50},
  {level: 6, name: 'Campione', minXP: 11500, maxXP: 15500, icon: 'ribbon', color: '#FF6B00', creditReward: 65},
  {level: 7, name: 'Maestro', minXP: 15500, maxXP: 20500, icon: 'star', color: '#FF6B00', creditReward: 80},
  {level: 8, name: 'Leggenda', minXP: 20500, maxXP: 26500, icon: 'diamond', color: '#FF6B00', creditReward: 90},
  {level: 9, name: 'Mito', minXP: 26500, maxXP: 33500, icon: 'flame', color: '#FF6B00', creditReward: 95},
  {level: 10, name: 'Divinita', minXP: 33500, maxXP: 999999, icon: 'trophy', color: '#FFD700', creditReward: 100},
];

export const DEFAULT_XP_REWARDS = {
  WATCH_AD: 3,
  PURCHASE_TICKET: 2,
  SKIP_AD: 0,
  PURCHASE_CREDITS: 0,
  WIN_PRIZE: 0,
  REFERRAL: 0,
};

export const DEFAULT_STREAK_CONFIG = {
  DAILY_XP: 5,
  DAY_7_XP: 10,
  DAY_7_CREDITS: 1,
  WEEK_1_CREDITS: 1,
  WEEK_2_CREDITS: 2,
  WEEK_3_CREDITS: 3,
  WEEK_4_CREDITS: 5,
  MAX_STREAK: 1000,
  RECOVERY_COST_PER_DAY: 2,
};

export const DEFAULT_DAILY_LIMITS = {
  MAX_TICKETS_PER_DAY: 60,
  MAX_ADS_PER_DAY: 72,
  AD_COOLDOWN_MINUTES: 20,
};

export const DEFAULT_REFERRAL_REWARDS = {
  DAYS_REQUIRED: 7,
  REFERRER_CREDITS: 15,
  REFERRED_CREDITS: 15,
};

export const DEFAULT_SHOP_PACKAGES = [
  {id: '1', credits: 10, price: 0.99, badge: null, discount: null},
  {id: '2', credits: 25, price: 1.99, badge: null, discount: null},
  {id: '3', credits: 60, price: 2.99, badge: 'most popular', discount: '-50%'},
  {id: '4', credits: 100, price: 4.49, badge: null, discount: null},
  {id: '5', credits: 250, price: 9.99, badge: null, discount: null},
  {id: '6', credits: 600, price: 19.99, badge: null, discount: null},
  {id: '7', credits: 1000, price: 29.99, badge: null, discount: '-69%'},
  {id: '8', credits: 2500, price: 59.99, badge: null, discount: '-76%'},
  {id: '9', credits: 6000, price: 99.99, badge: 'best value', discount: '-83%'},
];

export interface LevelConfig {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
  creditReward: number;
}

export interface ShopPackage {
  id: string;
  credits: number;
  price: number;
  badge: string | null;
  discount: string | null;
}

interface GameConfigState {
  levels: LevelConfig[];
  xpRewards: typeof DEFAULT_XP_REWARDS;
  streakConfig: typeof DEFAULT_STREAK_CONFIG;
  dailyLimits: typeof DEFAULT_DAILY_LIMITS;
  referralRewards: typeof DEFAULT_REFERRAL_REWARDS;
  shopPackages: ShopPackage[];
  isLoaded: boolean;
  lastFetched: number | null;

  fetchConfig: () => Promise<void>;
  getLevels: () => LevelConfig[];
  getXPRewards: () => typeof DEFAULT_XP_REWARDS;
  getStreakConfig: () => typeof DEFAULT_STREAK_CONFIG;
  getDailyLimits: () => typeof DEFAULT_DAILY_LIMITS;
  getReferralRewards: () => typeof DEFAULT_REFERRAL_REWARDS;
  getShopPackages: () => ShopPackage[];
}

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

export const useGameConfigStore = create<GameConfigState>()(
  persist(
    (set, get) => ({
      levels: DEFAULT_LEVELS,
      xpRewards: DEFAULT_XP_REWARDS,
      streakConfig: DEFAULT_STREAK_CONFIG,
      dailyLimits: DEFAULT_DAILY_LIMITS,
      referralRewards: DEFAULT_REFERRAL_REWARDS,
      shopPackages: DEFAULT_SHOP_PACKAGES,
      isLoaded: false,
      lastFetched: null,

      fetchConfig: async () => {
        // Skip if fetched recently
        const lastFetched = get().lastFetched;
        if (lastFetched && Date.now() - lastFetched < CACHE_TTL) {
          return;
        }

        try {
          // Fetch game-config (contains xpRewards, streakConfig, dailyLimits, referralRewards)
          const [configRes, levelsRes, shopRes] = await Promise.allSettled([
            apiClient.get('/settings/game-config'),
            apiClient.get('/settings/levels'),
            apiClient.get('/settings/shop-packages'),
          ]);

          const updates: Partial<GameConfigState> = {
            isLoaded: true,
            lastFetched: Date.now(),
          };

          // Parse game-config
          if (configRes.status === 'fulfilled' && configRes.value.data?.success) {
            const data = configRes.value.data.data;

            if (data.xp_rewards) {
              updates.xpRewards = {
                WATCH_AD: data.xp_rewards.watch_ad ?? DEFAULT_XP_REWARDS.WATCH_AD,
                PURCHASE_TICKET: data.xp_rewards.purchase_ticket ?? DEFAULT_XP_REWARDS.PURCHASE_TICKET,
                SKIP_AD: data.xp_rewards.skip_ad ?? DEFAULT_XP_REWARDS.SKIP_AD,
                PURCHASE_CREDITS: data.xp_rewards.purchase_credits ?? DEFAULT_XP_REWARDS.PURCHASE_CREDITS,
                WIN_PRIZE: data.xp_rewards.win_prize ?? DEFAULT_XP_REWARDS.WIN_PRIZE,
                REFERRAL: data.xp_rewards.referral ?? DEFAULT_XP_REWARDS.REFERRAL,
              };
            }

            if (data.streak_config) {
              updates.streakConfig = {
                DAILY_XP: data.streak_config.daily_xp ?? DEFAULT_STREAK_CONFIG.DAILY_XP,
                DAY_7_XP: data.streak_config.day_7_xp ?? DEFAULT_STREAK_CONFIG.DAY_7_XP,
                DAY_7_CREDITS: data.streak_config.day_7_credits ?? DEFAULT_STREAK_CONFIG.DAY_7_CREDITS,
                WEEK_1_CREDITS: data.streak_config.week_1_credits ?? DEFAULT_STREAK_CONFIG.WEEK_1_CREDITS,
                WEEK_2_CREDITS: data.streak_config.week_2_credits ?? DEFAULT_STREAK_CONFIG.WEEK_2_CREDITS,
                WEEK_3_CREDITS: data.streak_config.week_3_credits ?? DEFAULT_STREAK_CONFIG.WEEK_3_CREDITS,
                WEEK_4_CREDITS: data.streak_config.week_4_credits ?? DEFAULT_STREAK_CONFIG.WEEK_4_CREDITS,
                MAX_STREAK: data.streak_config.max_streak ?? DEFAULT_STREAK_CONFIG.MAX_STREAK,
                RECOVERY_COST_PER_DAY: data.streak_config.recovery_cost_per_day ?? DEFAULT_STREAK_CONFIG.RECOVERY_COST_PER_DAY,
              };
            }

            if (data.daily_limits) {
              updates.dailyLimits = {
                MAX_TICKETS_PER_DAY: data.daily_limits.max_tickets_per_day ?? DEFAULT_DAILY_LIMITS.MAX_TICKETS_PER_DAY,
                MAX_ADS_PER_DAY: data.daily_limits.max_ads_per_day ?? DEFAULT_DAILY_LIMITS.MAX_ADS_PER_DAY,
                AD_COOLDOWN_MINUTES: data.daily_limits.ad_cooldown_minutes ?? DEFAULT_DAILY_LIMITS.AD_COOLDOWN_MINUTES,
              };
            }

            if (data.referral_config) {
              updates.referralRewards = {
                DAYS_REQUIRED: data.referral_config.days_required ?? DEFAULT_REFERRAL_REWARDS.DAYS_REQUIRED,
                REFERRER_CREDITS: data.referral_config.referrer_credits ?? DEFAULT_REFERRAL_REWARDS.REFERRER_CREDITS,
                REFERRED_CREDITS: data.referral_config.referred_credits ?? DEFAULT_REFERRAL_REWARDS.REFERRED_CREDITS,
              };
            }
          }

          // Parse levels
          if (levelsRes.status === 'fulfilled' && levelsRes.value.data?.success) {
            const levelsData = levelsRes.value.data.data;
            if (Array.isArray(levelsData) && levelsData.length > 0) {
              updates.levels = levelsData.map((l: any) => ({
                level: l.level,
                name: l.name,
                minXP: l.min_xp ?? l.minXP,
                maxXP: l.max_xp ?? l.maxXP,
                icon: l.icon,
                color: l.color,
                creditReward: l.credit_reward ?? l.creditReward,
              }));
            }
          }

          // Parse shop packages
          if (shopRes.status === 'fulfilled' && shopRes.value.data?.success) {
            const packagesData = shopRes.value.data.data;
            if (Array.isArray(packagesData) && packagesData.length > 0) {
              updates.shopPackages = packagesData.map((p: any) => ({
                id: String(p.id),
                credits: p.credits,
                price: parseFloat(p.price),
                badge: p.badge || null,
                discount: p.discount || null,
              }));
            }
          }

          set(updates);
          console.log('[GameConfig] Config loaded from API');
        } catch (error) {
          console.log('[GameConfig] API fetch failed, using cached/default values:', error);
          set({isLoaded: true});
        }
      },

      getLevels: () => get().levels,
      getXPRewards: () => get().xpRewards,
      getStreakConfig: () => get().streakConfig,
      getDailyLimits: () => get().dailyLimits,
      getReferralRewards: () => get().referralRewards,
      getShopPackages: () => get().shopPackages,
    }),
    {
      name: 'rafflemania-game-config-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        levels: state.levels,
        xpRewards: state.xpRewards,
        streakConfig: state.streakConfig,
        dailyLimits: state.dailyLimits,
        referralRewards: state.referralRewards,
        shopPackages: state.shopPackages,
        lastFetched: state.lastFetched,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      },
    }
  )
);
