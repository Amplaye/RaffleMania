import React, {useEffect, useRef, useState, useCallback} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {View, Text, StyleSheet, StatusBar, Platform} from 'react-native';
import {useAuthStore, usePrizesStore, useExtractionStore, useTicketsStore} from '../store';
import {useThemeColors} from '../hooks/useThemeColors';
import {Prize} from '../types';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT} from '../utils/constants';
import {ScreenContainer, Button, UrgencyBorderEffect, ExtractionStartEffect, ExtractionResultModal} from '../components/common';

// Import actual screens
import {CreditsScreen} from '../screens/credits';
import {MyWinsScreen} from '../screens/mywins';
import {ReferralScreen} from '../screens/referral';
import {AddressFormScreen} from '../screens/address';
import {SettingsScreen} from '../screens/settings';
import {TicketDetailScreen} from '../screens/ticketdetail';
import {LevelDetailScreen} from '../screens/leveldetail';
import {PrizeDetailScreen} from '../screens/prizedetail';
import {AvatarCustomizationScreen} from '../screens/avatar';
import {LeaderboardScreen} from '../screens/leaderboard';

// Stack param list
export type RootStackParamList = {
  MainTabs: undefined;
  TicketDetail: {ticketId: string};
  PrizeDetail: {prizeId: string};
  Credits: undefined;
  Winners: undefined;
  Referral: undefined;
  Settings: undefined;
  AddressForm: undefined;
  MyWins: undefined;
  LevelDetail: undefined;
  AvatarCustomization: undefined;
  Leaderboard: undefined;
};

type PlaceholderProps = NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>;

// Placeholder for screens still in development
const PlaceholderScreen: React.FC<{title: string} & PlaceholderProps> = ({
  title,
  navigation,
}) => (
  <ScreenContainer>
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.title}>{title}</Text>
      <Text style={placeholderStyles.subtitle}>Questa schermata e in sviluppo</Text>
      <Button
        title="Torna Indietro"
        onPress={() => navigation.goBack()}
        variant="outline"
      />
    </View>
  </ScreenContainer>
);

// Placeholder for screens not yet implemented
const WinnersScreen = (props: NativeStackScreenProps<RootStackParamList, 'Winners'>) => (
  <PlaceholderScreen title="Tutti i Vincitori" {...props} />
);

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainStack: React.FC = () => {
  const {colors} = useThemeColors();

  // Get status bar height for Android (the status bar is translucent in ScreenContainer)
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{title: 'Dettaglio Biglietto'}}
      />
      <Stack.Screen
        name="PrizeDetail"
        component={PrizeDetailScreen}
        options={{title: 'Dettaglio Premio'}}
      />
      <Stack.Screen
        name="Credits"
        component={CreditsScreen}
        options={{title: 'I Miei Crediti'}}
      />
      <Stack.Screen
        name="Winners"
        component={WinnersScreen}
        options={{title: 'Vincitori'}}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{title: 'Invita Amici'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Impostazioni'}}
      />
      <Stack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{title: 'Indirizzo'}}
      />
      <Stack.Screen
        name="MyWins"
        component={MyWinsScreen}
        options={{title: 'Le Mie Vincite'}}
      />
      <Stack.Screen
        name="LevelDetail"
        component={LevelDetailScreen}
        options={{title: 'Sistema Livelli'}}
      />
      <Stack.Screen
        name="AvatarCustomization"
        component={AvatarCustomizationScreen}
        options={{title: 'Personalizza Avatar'}}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{title: 'Classifica'}}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const {isAuthenticated} = useAuthStore();
  const {
    prizes,
    markPrizeAsExtracting,
    completePrizeExtraction,
    resetPrizeForNextRound,
    addWin,
  } = usePrizesStore();
  const {simulateExtraction, getTicketsForPrize, getTicketNumbersForPrize} = useTicketsStore();
  const {
    showExtractionEffect,
    showResultModal,
    extractionResult,
    startExtraction,
    showResult,
    hideResult,
  } = useExtractionStore();
  const user = useAuthStore(state => state.user);

  // Track which prizes have already triggered extraction
  const extractedPrizeIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  // State for urgency effect
  const [urgencyPrize, setUrgencyPrize] = useState<Prize | null>(null);
  const [urgencySeconds, setUrgencySeconds] = useState(0);

  // Trigger extraction for a prize - defined before useEffect that uses it
  const triggerExtraction = useCallback((prize: Prize) => {
    // Mark prize as extracting
    markPrizeAsExtracting(prize.id);

    // Start the extraction effect
    startExtraction();

    // After effect, simulate the extraction
    setTimeout(() => {
      const result = simulateExtraction(prize.id, prize.name, prize.imageUrl);

      // Generate drawId for this prize
      const drawId = `draw_${prize.id}_${(prize.timerStartedAt || new Date().toISOString()).replace(/[^0-9]/g, '').slice(0, 14)}`;

      // If winner, add to wins
      if (result.isWinner && user) {
        const userTickets = getTicketsForPrize(prize.id);
        if (userTickets.length > 0) {
          addWin(prize.id, drawId, userTickets[0].id, user.id);
        }
      }

      showResult({
        ...result,
        prizeImage: prize.imageUrl,
      });

      // Complete extraction and reset for next round
      completePrizeExtraction(prize.id);

      // After a delay, reset the prize for a new round
      setTimeout(() => {
        resetPrizeForNextRound(prize.id);
        // Allow re-extraction for this prize in the future
        extractedPrizeIds.current.delete(prize.id);
      }, 2000);
    }, 3000); // Duration of extraction effect
  }, [user, markPrizeAsExtracting, startExtraction, simulateExtraction, getTicketsForPrize, addWin, showResult, completePrizeExtraction, resetPrizeForNextRound]);

  // Initialize
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Monitor all prizes with active timers
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (!isInitialized.current) return;

      const now = Date.now();

      // Find prizes with countdown status
      const prizesWithTimer = prizes.filter(p => p.timerStatus === 'countdown' && p.scheduledAt);

      // Check each prize
      for (const prize of prizesWithTimer) {
        const scheduledTime = new Date(prize.scheduledAt!).getTime();
        const remainingSeconds = Math.max(0, Math.floor((scheduledTime - now) / 1000));

        // Update urgency for the prize with least time remaining
        if (remainingSeconds <= 60 && remainingSeconds > 0) {
          setUrgencyPrize(prize);
          setUrgencySeconds(remainingSeconds);
        }

        // Timer has expired - trigger extraction
        if (remainingSeconds === 0 && !extractedPrizeIds.current.has(prize.id)) {
          extractedPrizeIds.current.add(prize.id);
          triggerExtraction(prize);
        }
      }

      // Clear urgency if no prize is in last minute
      const anyInLastMinute = prizesWithTimer.some(p => {
        const scheduledTime = new Date(p.scheduledAt!).getTime();
        const remaining = Math.floor((scheduledTime - now) / 1000);
        return remaining > 0 && remaining <= 60;
      });
      if (!anyInLastMinute) {
        setUrgencyPrize(null);
        setUrgencySeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prizes, isAuthenticated, triggerExtraction]);

  // Determine urgency intensity based on remaining time
  const getUrgencyIntensity = (): 'low' | 'medium' | 'high' => {
    if (urgencySeconds <= 10) return 'high';
    if (urgencySeconds <= 30) return 'medium';
    return 'low';
  };

  const isLastMinute = urgencyPrize !== null && urgencySeconds > 0 && urgencySeconds <= 60;

  return (
    <View style={styles.appContainer}>
      <NavigationContainer>
        {isAuthenticated ? <MainStack /> : <AuthNavigator />}
      </NavigationContainer>

      {/* Global Urgency Border Effect - visible across ALL screens */}
      {isAuthenticated && (
        <UrgencyBorderEffect
          isActive={isLastMinute}
          intensity={getUrgencyIntensity()}
        />
      )}

      {/* Global Extraction Effect - visible across ALL screens */}
      {isAuthenticated && showExtractionEffect && (
        <ExtractionStartEffect
          visible={showExtractionEffect}
        />
      )}

      {/* Global Extraction Result Modal - visible across ALL screens */}
      {isAuthenticated && (
        <ExtractionResultModal
          visible={showResultModal}
          isWinner={extractionResult?.isWinner || false}
          prizeName={extractionResult?.prizeName}
          prizeImage={extractionResult?.prizeImage}
          winningNumber={extractionResult?.winningNumber}
          userNumbers={extractionResult?.userNumbers}
          onClose={hideResult}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
