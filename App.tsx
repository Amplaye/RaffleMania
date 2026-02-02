import React, {useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OneSignal} from 'react-native-onesignal';
import {AppNavigator} from './src/navigation';
import {LevelUpOverlay} from './src/components/common';
import {COLORS} from './src/utils/constants';

// OneSignal App ID
const ONESIGNAL_APP_ID = '7d7f743b-3dac-472e-b05d-e4445842dc0a';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Request notification permissions
    OneSignal.Notifications.requestPermission(true);
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
