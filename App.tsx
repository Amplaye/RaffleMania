import React, {useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OneSignal, NotificationClickEvent} from 'react-native-onesignal';
import {AppNavigator} from './src/navigation';
import {LevelUpOverlay} from './src/components/common';
import {COLORS} from './src/utils/constants';
import {navigate} from './src/services/NavigationService';

// OneSignal App ID
const ONESIGNAL_APP_ID = '7d7f743b-3dac-472e-b05d-e4445842dc0a';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Request notification permissions
    OneSignal.Notifications.requestPermission(true);

    // Handle notification click
    OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as Record<string, string> | undefined;

      if (data?.type === 'support_chat') {
        // Navigate to support chat when user taps on support notification
        setTimeout(() => {
          navigate('SupportChat');
        }, 500); // Small delay to ensure navigation is ready
      } else if (data?.type === 'winner') {
        // Navigate to MyWins when user taps on winner notification
        setTimeout(() => {
          navigate('MyWins');
        }, 500);
      } else if (data?.type === 'new_prize' && data?.prize_id) {
        // Navigate to prize detail when user taps on new prize notification
        setTimeout(() => {
          navigate('PrizeDetail', {prizeId: data.prize_id});
        }, 500);
      }
    });

    // Cleanup listener on unmount
    return () => {
      OneSignal.Notifications.removeEventListener('click', () => {});
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />
      <View style={{flex: 1}}>
        <AppNavigator />
        <LevelUpOverlay />
      </View>
    </SafeAreaProvider>
  );
};

export default App;
