import {Platform} from 'react-native';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  BannerAdSize,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// ============================================
// AD UNIT IDS
// Replace with real AdMob IDs when going live
// ============================================
const USE_TEST_ADS = __DEV__;

const AD_UNIT_IDS = {
  rewarded: {
    android: USE_TEST_ADS ? TestIds.REWARDED : 'ca-app-pub-8523164888212226/5651017854',
    ios: USE_TEST_ADS ? TestIds.REWARDED : 'ca-app-pub-8523164888212226/7576249717',
  },
  banner: {
    android: USE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-8523164888212226/3510670750',
    ios: USE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-8523164888212226/5459446162',
  },
};

export function getAdUnitId(type: 'rewarded' | 'banner'): string {
  const ids = AD_UNIT_IDS[type];
  return Platform.OS === 'ios' ? ids.ios : ids.android;
}

// ============================================
// INITIALIZATION
// ============================================
let isInitialized = false;

export async function initializeAds(): Promise<boolean> {
  if (isInitialized) return true;
  try {
    await mobileAds().initialize();
    isInitialized = true;
    console.log('[AdService] Mobile Ads SDK initialized');
    return true;
  } catch (error) {
    console.log('[AdService] Failed to initialize:', error);
    return false;
  }
}

// ============================================
// REWARDED ADS
// ============================================
let rewardedAd: RewardedAd | null = null;
let isRewardedLoading = false;
let isRewardedReady = false;

/**
 * Preload a rewarded ad so it's ready when the user taps "Watch Ad"
 */
export function preloadRewardedAd(): void {
  if (isRewardedLoading || isRewardedReady) return;

  const adUnitId = getAdUnitId('rewarded');
  rewardedAd = RewardedAd.createForAdRequest(adUnitId);
  isRewardedLoading = true;

  rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    isRewardedLoading = false;
    isRewardedReady = true;
    console.log('[AdService] Rewarded ad loaded');
  });

  rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    isRewardedLoading = false;
    isRewardedReady = false;
    console.log('[AdService] Rewarded ad failed to load:', error.message);
  });

  rewardedAd.load();
}

/**
 * Show a rewarded ad and return whether the user earned the reward
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedAd || !isRewardedReady) {
      console.log('[AdService] Rewarded ad not ready');
      resolve(false);
      return;
    }

    let rewarded = false;

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewarded = true;
      console.log('[AdService] User earned reward');
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      isRewardedReady = false;
      rewardedAd = null;
      // Preload next ad
      preloadRewardedAd();
      resolve(rewarded);
    });

    rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[AdService] Rewarded ad error:', error.message);
      isRewardedReady = false;
      rewardedAd = null;
      preloadRewardedAd();
      resolve(false);
    });

    rewardedAd.show();
  });
}

/**
 * Check if a rewarded ad is ready to show
 */
export function isRewardedAdReady(): boolean {
  return isRewardedReady;
}

// ============================================
// AD READY NOTIFICATION (scheduled via server)
// ============================================

/**
 * Schedule a push notification for when the ad cooldown expires.
 * Calls the server which uses OneSignal's send_after to deliver
 * the notification after the configured cooldown period.
 */
export async function scheduleAdReadyNotification(): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const {default: apiClient} = await import('./apiClient');
    await apiClient.post('/notifications/schedule-ad-ready');
    console.log('[AdService] Ad-ready notification scheduled');
  } catch (error) {
    // Non-critical: don't block the user experience
    console.log('[AdService] Failed to schedule ad-ready notification:', error);
  }
}

// ============================================
// EXPORTS for Banner component usage
// ============================================
export {BannerAdSize, TestIds};
export {BannerAd} from 'react-native-google-mobile-ads';
