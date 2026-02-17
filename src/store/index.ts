export {useAuthStore} from './useAuthStore';
export {useTicketsStore, debugTicketsStorage, DAILY_LIMITS} from './useTicketsStore';
export type {ExtractionResult} from './useTicketsStore';
export {useCreditsStore} from './useCreditsStore';
export {usePrizesStore, getUrgentThresholdForPrize, BETTING_LOCK_SECONDS} from './usePrizesStore';
export type {PrizeSortOption} from './usePrizesStore';
export {useThemeStore} from './useThemeStore';
export {useLevelStore, XP_REWARDS, LEVELS} from './useLevelStore';
export {useStreakStore, STREAK_REWARDS, setMidnightStreakCallback} from './useStreakStore';
export {useLeaderboardStore} from './useLeaderboardStore';
export {useExtractionStore} from './useExtractionStore';
export {useGameConfigStore} from './useGameConfigStore';
export type {LevelConfig, ShopPackage} from './useGameConfigStore';
export {useSettingsStore, getXPRewards} from './useSettingsStore';
export {useReferralStore, REFERRAL_REWARDS} from './useReferralStore';
export type {ReferredUser, ReferrerInfo} from './useReferralStore';
export {useLevelUpStore} from './useLevelUpStore';
export {useChatStore} from './useChatStore';
export type {ChatMessage} from './useChatStore';
export {useAdminChatStore} from './useAdminChatStore';
export type {ChatRoom, ChatMessage as AdminChatMessage} from './useAdminChatStore';
export {useAvatarStore, AVATARS, FRAMES} from './useAvatarStore';
export type {Avatar, Frame} from './useAvatarStore';

// Sync all stores after login - call this after any successful authentication
export const syncStoresAfterLogin = async () => {
  try {
    const {useStreakStore: streakStore} = await import('./useStreakStore');
    await streakStore.getState().syncFromServer();
  } catch (error) {
    console.log('[syncStoresAfterLogin] Error:', error);
  }
};
