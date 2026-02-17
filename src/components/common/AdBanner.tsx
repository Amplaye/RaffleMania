import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {BannerAd, BannerAdSize, getAdUnitId} from '../../services/adService';
import {useAuthStore} from '../../store';
import {RADIUS, SPACING} from '../../utils/constants';

interface AdBannerProps {
  style?: any;
}

export const AdBanner: React.FC<AdBannerProps> = ({style}) => {
  const adFree = useAuthStore(state => state.user?.adFree);
  const [adLoaded, setAdLoaded] = useState(false);

  // Don't render banner if user has purchased ad-free
  if (adFree) {
    return null;
  }

  return (
    <View style={[styles.container, style, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.log('[AdBanner] Failed to load:', error.message);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});

export default AdBanner;
