import React, {useEffect, useState} from 'react';
import {StatusBar, View, AppState, Platform, Alert, Linking, LogBox} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OneSignal, NotificationClickEvent} from 'react-native-onesignal';
import crashlytics from '@react-native-firebase/crashlytics';
import {AppNavigator} from './src/navigation';
import {LevelUpOverlay, VideoSplashScreen} from './src/components/common';
import {COLORS} from './src/utils/constants';
import {navigate} from './src/services/NavigationService';
import {rewardEvents} from './src/services/rewardEvents';
import {extractionEvents} from './src/services/extractionEvents';
import {initIAP, endIAPConnection} from './src/services/paymentService';
import {initializeAds, preloadRewardedAd} from './src/services/adService';
import {useSettingsStore} from './src/store/useSettingsStore';
import {usePrizesStore} from './src/store/usePrizesStore';
import {useAuthStore} from './src/store/useAuthStore';

// Suppress all development-only warnings and known deprecation errors
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  'This method is deprecated',
  'react-native-nitro-modules',
  'NitroModules',
  'Failed to get NitroModules',
  'Nitro runtime not installed',
  '[RN-IAP]',
]);

// Disable console.log in production to avoid exposing sensitive data
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// OneSignal App ID
const ONESIGNAL_APP_ID = '7d7f743b-3dac-472e-b05d-e4445842dc0a';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize Firebase Crashlytics
    crashlytics().setCrashlyticsCollectionEnabled(true);

    // Initialize IAP connection (safe - catches if native module not available)
    initIAP().then(success => {
      console.log('[App] IAP init:', success ? 'connected' : 'failed');
    }).catch(() => {});

    // Initialize AdMob and preload first rewarded ad
    initializeAds().then(success => {
      if (success) {
        preloadRewardedAd();
      }
    });

    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Sync notification toggle state with actual OneSignal subscription
    const syncPushState = async () => {
      const hasPermission = await OneSignal.Notifications.getPermissionAsync();
      if (hasPermission) {
        OneSignal.User.pushSubscription.optIn();
      }
      // Sync the settings store toggle with actual permission state
      const currentPrefs = useSettingsStore.getState().notifications;
      if (currentPrefs.pushEnabled !== hasPermission) {
        useSettingsStore.setState({
          notifications: {...currentPrefs, pushEnabled: hasPermission},
        });
      }
    };

    // Request notification permissions
    OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
      if (accepted) {
        // Permission granted - immediately opt in and sync state
        OneSignal.User.pushSubscription.optIn();
        const prefs = useSettingsStore.getState().notifications;
        if (!prefs.pushEnabled) {
          useSettingsStore.setState({
            notifications: {...prefs, pushEnabled: true},
          });
        }
      } else if (Platform.OS === 'ios') {
        // Permission denied on iOS - prompt to enable in Settings
        const prefs = useSettingsStore.getState().notifications;
        if (prefs.pushEnabled) {
          useSettingsStore.setState({
            notifications: {...prefs, pushEnabled: false},
          });
        }
        setTimeout(() => {
          Alert.alert(
            'Notifiche Disabilitate',
            'Per ricevere le notifiche di RaffleMania (vincite, messaggi di supporto, ecc.), attiva le notifiche nelle impostazioni del dispositivo.',
            [
              {text: 'Dopo', style: 'cancel'},
              {
                text: 'Apri Impostazioni',
                onPress: () => Linking.openURL('app-settings:'),
              },
            ],
          );
        }, 1000);
      }
    });

    // Sync push state (async and non-blocking)
    syncPushState();

    // Re-check permission when app comes back from Settings
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncPushState();
      }
    });

    // Show notifications even when app is in foreground
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      const notification = event.getNotification();
      const data = notification.additionalData as Record<string, string> | undefined;

      // For bulk_reward notifications, suppress the banner and trigger in-app popup instead
      if (data?.type === 'bulk_reward') {
        event.preventDefault();
        // Delay slightly to let the server finish creating notification records
        setTimeout(() => rewardEvents.emit(), 1500);
        return;
      }

      // For extraction_completed notifications, show banner AND trigger missed extraction check
      if (data?.type === 'extraction_completed') {
        notification.display();
        setTimeout(() => extractionEvents.emit(), 2000);
        return;
      }

      // For prize_delivered notifications, show banner AND refresh myWins data
      if (data?.type === 'prize_delivered') {
        notification.display();
        setTimeout(() => {
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            usePrizesStore.getState().fetchMyWins(userId);
          }
        }, 1500);
        return;
      }

      notification.display();
    });

    // Handle notification click
    // navigate() automatically queues and retries if navigator isn't ready (cold start)
    OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as Record<string, string> | undefined;

      if (data?.type === 'support_chat') {
        navigate('SupportChat');
      } else if (data?.type === 'admin_support_message' && data?.user_id) {
        navigate('AdminChatDetail', {
          userId: data.user_id,
          userName: data.user_name || 'Utente',
        });
      } else if (data?.type === 'winner' || data?.type === 'extraction_result') {
        navigate('MyWins');
      } else if (data?.type === 'new_prize' && data?.prize_id) {
        navigate('PrizeDetail', {prizeId: data.prize_id});
      } else if (data?.type === 'prize_delivered') {
        // Refresh wins data and navigate to MyWins
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          usePrizesStore.getState().fetchMyWins(userId);
        }
        navigate('MyWins');
      }
    });

    // Cleanup listeners on unmount
    return () => {
      appStateSubscription.remove();
      endIAPConnection();
    };
  }, []);

  if (showSplash) {
    return <VideoSplashScreen onFinish={() => setShowSplash(false)} />;
  }

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
