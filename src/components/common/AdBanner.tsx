import React, {useState, useRef, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {BannerAd, BannerAdSize, getAdUnitId} from '../../services/adService';
import {useAuthStore} from '../../store';
import {SPACING} from '../../utils/constants';

const RETRY_DELAY_MS = 30000; // 30 seconds before retry

interface AdBannerProps {
  style?: any;
}

export const AdBanner: React.FC<AdBannerProps> = ({style}) => {
  const adFree = useAuthStore(state => state.user?.adFree);
  const [adLoaded, setAdLoaded] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [retryKey, setRetryKey] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdLoaded = useCallback(() => {
    setAdLoaded(true);
    hasLoadedOnce.current = true;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const handleAdFailed = useCallback((error: any) => {
    console.log('[AdBanner] Failed to load:', error.message);
    // Don't hide if banner loaded successfully before (just keep showing old ad)
    if (!hasLoadedOnce.current) {
      setAdLoaded(false);
    }

    // Schedule a retry after delay
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
    }
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      setRetryKey(prev => prev + 1);
    }, RETRY_DELAY_MS);
  }, []);

  // Don't render banner if user has purchased ad-free
  if (adFree) {
    return null;
  }

  return (
    <View style={[styles.container, style, !adLoaded && styles.hidden]}>
      <BannerAd
        key={retryKey}
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginBottom: SPACING.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});

export default AdBanner;
