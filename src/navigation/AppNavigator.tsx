import React, {useEffect, useRef, useState, useCallback} from 'react';
import {NavigationContainer, LinkingOptions} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {View, Text, StyleSheet} from 'react-native';
import {useAuthStore, usePrizesStore, useExtractionStore, useTicketsStore} from '../store';
import {Prize} from '../types';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT, API_CONFIG} from '../utils/constants';
import {ScreenContainer, Button, UrgencyBorderEffect, ExtractionStartEffect, ExtractionResultModal, MissedExtractionModal} from '../components/common';
import {navigationRef, processPendingNavigation} from '../services/NavigationService';
import apiClient from '../services/apiClient';

// Import actual screens
import {MyWinsScreen} from '../screens/mywins';
import {ReferralScreen} from '../screens/referral';
import {AddressFormScreen} from '../screens/address';
import {SettingsScreen} from '../screens/settings';
import {TicketDetailScreen} from '../screens/ticketdetail';
import {LevelDetailScreen} from '../screens/leveldetail';
import {PrizeDetailScreen} from '../screens/prizedetail';
import {AvatarCustomizationScreen} from '../screens/avatar';
import {LeaderboardScreen} from '../screens/leaderboard';
import {EmailVerificationScreen} from '../screens/auth';
import {StreakScreen} from '../screens/streak';
import {SupportChatScreen} from '../screens/support';
import {AdminChatListScreen, AdminChatDetailScreen} from '../screens/admin';

// Stack param list
export type RootStackParamList = {
  MainTabs: undefined;
  TicketDetail: {ticketId: string};
  PrizeDetail: {prizeId: string};
  Winners: undefined;
  Referral: undefined;
  Settings: undefined;
  AddressForm: undefined;
  MyWins: undefined;
  LevelDetail: undefined;
  AvatarCustomization: undefined;
  Leaderboard: undefined;
  EmailVerification: {email?: string; token?: string};
  Streak: undefined;
  SupportChat: undefined;
  // Admin screens
  AdminChatList: undefined;
  AdminChatDetail: {userId: string; userName: string};
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

// Deep linking configuration for email verification
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['rafflemania://'],
  config: {
    screens: {
      EmailVerification: {
        path: 'verify',
        parse: {
          token: (token: string) => token,
        },
      },
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainStack: React.FC = () => {
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
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{title: 'Verifica Email'}}
      />
      <Stack.Screen
        name="Streak"
        component={StreakScreen}
        options={{title: 'Login Streak'}}
      />
      <Stack.Screen
        name="SupportChat"
        component={SupportChatScreen}
        options={{title: 'Assistenza'}}
      />
      {/* Admin Screens */}
      <Stack.Screen
        name="AdminChatList"
        component={AdminChatListScreen}
        options={{title: 'Chat Supporto'}}
      />
      <Stack.Screen
        name="AdminChatDetail"
        component={AdminChatDetailScreen}
        options={{title: 'Chat'}}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const {isAuthenticated, sessionActive} = useAuthStore();
  const {
    prizes,
    markPrizeAsExtracting,
    completePrizeExtraction,
    resetPrizeAfterExtraction,
    syncTimerToBackend,
    addWin,
  } = usePrizesStore();
  const {simulateExtraction, getTicketsForPrize, clearTicketsForPrize} = useTicketsStore();
  const {
    showExtractionEffect,
    showResultModal,
    extractionResult,
    startExtraction,
    showResult,
    hideResult,
    // Missed extractions
    missedExtractions,
    currentMissedIndex,
    showMissedModal,
    fetchMissedExtractions,
    dismissMissedExtraction,
  } = useExtractionStore();
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);

  // Track which drawIds have already triggered extraction (never cleared)
  const extractedDrawIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  // State for urgency effect
  const [urgencyPrize, setUrgencyPrize] = useState<Prize | null>(null);
  const [urgencySeconds, setUrgencySeconds] = useState(0);

  // Trigger extraction for a prize - server-driven winning number
  const triggerExtraction = useCallback(async (prize: Prize) => {
    // Mark prize as extracting locally
    markPrizeAsExtracting(prize.id);

    // Start the extraction animation (video effect)
    startExtraction();

    const isGuestUser = token?.startsWith('guest_token_');
    const useMockMode = API_CONFIG.USE_MOCK_DATA || isGuestUser;

    // Run animation timer and server call IN PARALLEL
    // The result is shown only after BOTH complete
    const minAnimationTime = new Promise<void>(resolve => setTimeout(() => resolve(), 3000));

    let winningNumber = 0;
    let isWinner = false;
    const userTickets = getTicketsForPrize(prize.id);
    const userNumbers = userTickets.map(t => t.ticketNumber);

    const serverCall = (async () => {
      if (useMockMode) {
        // Guest/mock: use local simulation (no server)
        const result = simulateExtraction(prize.id, prize.name, prize.imageUrl);
        winningNumber = result.winningNumber || 0;
        isWinner = result.isWinner;
      } else {
        // Authenticated: server picks winning number from REAL tickets in DB
        // Same number returned to ALL devices calling this endpoint
        try {
          const payload: any = {prize_id: parseInt(prize.id, 10)};
          if (prize.timerStartedAt) {
            payload.timer_started_at = prize.timerStartedAt;
          }
          const response = await apiClient.post('/draws', payload);
          const noTickets = response.data?.data?.no_tickets;
          const alreadyExists = response.data?.data?.already_exists;
          const drawData = response.data?.data?.draw;
          console.log(`[Extraction] Server response: noTickets=${noTickets}, alreadyExists=${alreadyExists}, winningNumber=${drawData?.winningNumber}, totalTickets=${drawData?.totalTickets}`);
          if (drawData) {
            winningNumber = drawData.winningNumber || 0;
            isWinner = userNumbers.includes(winningNumber);

            // Move user's tickets to past
            if (userTickets.length > 0) {
              const {activeTickets, pastTickets} = useTicketsStore.getState();
              const now = new Date().toISOString();
              const updatedUserTickets = userTickets.map(ticket => ({
                ...ticket,
                isWinner: ticket.ticketNumber === winningNumber,
                wonAt: ticket.ticketNumber === winningNumber ? now : undefined,
                prizeName: ticket.ticketNumber === winningNumber ? prize.name : undefined,
                prizeImage: ticket.ticketNumber === winningNumber ? prize.imageUrl : undefined,
              }));
              const remainingActive = activeTickets.filter(t => t.prizeId !== prize.id);
              useTicketsStore.setState({
                activeTickets: remainingActive,
                pastTickets: [...updatedUserTickets, ...pastTickets],
              });
            }
          }
        } catch (error) {
          console.log('[Extraction] Server draw failed:', error);
          // For authenticated users, DO NOT fall back to random local numbers
          // Show 0 as winning number to indicate an error occurred
          winningNumber = 0;
          isWinner = false;
        }
      }
    })();

    // Wait for both animation and server response
    await Promise.all([minAnimationTime, serverCall]);

    // Generate drawId for tracking
    const drawId = `draw_${prize.id}_${(prize.timerStartedAt || new Date().toISOString()).replace(/[^0-9]/g, '').slice(0, 14)}`;

    // If winner, add to wins
    if (isWinner && user && userTickets.length > 0) {
      addWin(prize.id, drawId, userTickets[0].id, user.id);
    }

    // Show the result modal with the definitive winning number from server
    showResult({
      isWinner,
      winningNumber,
      userNumbers,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeImage: prize.imageUrl,
    });

    // Mark extraction complete locally (stops countdown display)
    completePrizeExtraction(prize.id, winningNumber);

    // Sync timer status to server (ensures server knows extraction is done,
    // even if POST /draws returned no_tickets and didn't update timer_status)
    syncTimerToBackend(prize.id, 'completed');

    // Clean up tickets and reset prize for next round after a delay
    setTimeout(() => {
      clearTicketsForPrize(prize.id);
      // Reset prize for next round (clears timer, resets currentAds to 0)
      resetPrizeAfterExtraction(prize.id);
    }, 5000);
  }, [user, token, markPrizeAsExtracting, startExtraction, simulateExtraction, getTicketsForPrize, addWin, showResult, completePrizeExtraction, resetPrizeAfterExtraction, syncTimerToBackend, clearTicketsForPrize]);

  // Initialize
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Check for missed extractions on app start (after auth)
  const missedChecked = useRef(false);
  useEffect(() => {
    if (isAuthenticated && sessionActive && !missedChecked.current) {
      missedChecked.current = true;
      // Delay to let the app settle before checking
      setTimeout(() => {
        fetchMissedExtractions();
      }, 2000);
    }
    if (!isAuthenticated || !sessionActive) {
      missedChecked.current = false;
    }
  }, [isAuthenticated, sessionActive, fetchMissedExtractions]);

  // Monitor all prizes with active timers
  useEffect(() => {
    if (!isAuthenticated || !sessionActive) return;

    const interval = setInterval(() => {
      if (!isInitialized.current) return;

      const now = Date.now();

      // Find prizes with countdown status
      const prizesWithTimer = prizes.filter(p => p.timerStatus === 'countdown' && p.scheduledAt);

      // Check each prize
      for (const prize of prizesWithTimer) {
        const scheduledTime = new Date(prize.scheduledAt!).getTime();
        const diffSeconds = Math.floor((scheduledTime - now) / 1000);
        const remainingSeconds = Math.max(0, diffSeconds);

        // Generate unique drawId for this specific round
        const drawId = `draw_${prize.id}_${(prize.timerStartedAt || prize.scheduledAt || '').replace(/[^0-9]/g, '').slice(0, 14)}`;

        // Update urgency for the prize with least time remaining
        if (remainingSeconds <= 60 && remainingSeconds > 0) {
          setUrgencyPrize(prize);
          setUrgencySeconds(remainingSeconds);
        }

        // Timer has expired - trigger extraction
        // Only trigger if scheduledAt just passed (within 60s) and this drawId hasn't been extracted yet
        if (remainingSeconds === 0 && diffSeconds >= -60 && !extractedDrawIds.current.has(drawId)) {
          extractedDrawIds.current.add(drawId);
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
  }, [prizes, isAuthenticated, sessionActive, triggerExtraction]);

  // Determine urgency intensity based on remaining time
  const getUrgencyIntensity = (): 'low' | 'medium' | 'high' => {
    if (urgencySeconds <= 10) return 'high';
    if (urgencySeconds <= 30) return 'medium';
    return 'low';
  };

  const isLastMinute = urgencyPrize !== null && urgencySeconds > 0 && urgencySeconds <= 60;

  return (
    <View style={styles.appContainer}>
      <NavigationContainer ref={navigationRef} linking={linking} onReady={processPendingNavigation}>
        {isAuthenticated && sessionActive ? <MainStack /> : <AuthNavigator />}
      </NavigationContainer>

      {/* Global Urgency Border Effect - visible across ALL screens */}
      {isAuthenticated && sessionActive && (
        <UrgencyBorderEffect
          isActive={isLastMinute}
          intensity={getUrgencyIntensity()}
        />
      )}

      {/* Global Extraction Effect - visible across ALL screens */}
      {isAuthenticated && sessionActive && showExtractionEffect && (
        <ExtractionStartEffect
          visible={showExtractionEffect}
        />
      )}

      {/* Global Extraction Result Modal - visible across ALL screens */}
      {isAuthenticated && sessionActive && (
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

      {/* Missed Extraction Modal - shown when user was offline during extraction */}
      {isAuthenticated && sessionActive && (
        <MissedExtractionModal
          visible={showMissedModal}
          extraction={missedExtractions[currentMissedIndex] || null}
          currentIndex={currentMissedIndex}
          totalCount={missedExtractions.length}
          onDismiss={dismissMissedExtraction}
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
