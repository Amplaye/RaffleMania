import React, {useEffect, useRef, useState, useCallback} from 'react';
import {NavigationContainer, LinkingOptions} from '@react-navigation/native';
import {createNativeStackNavigator, NativeStackScreenProps} from '@react-navigation/native-stack';
import {View, Text, StyleSheet, AppState} from 'react-native';
import {useAuthStore, usePrizesStore, useExtractionStore, useTicketsStore} from '../store';
import {Prize} from '../types';
import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import {COLORS, FONT_SIZE, FONT_WEIGHT, API_CONFIG} from '../utils/constants';
import {ScreenContainer, Button, UrgencyBorderEffect, ExtractionStartEffect, ExtractionResultModal, MissedExtractionModal, RewardPopupModal} from '../components/common';
import type {RewardNotification} from '../components/common';
import {navigationRef, processPendingNavigation} from '../services/NavigationService';
import apiClient from '../services/apiClient';
import {listenForDrawResult, publishDrawResult} from '../services/firebaseExtraction';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {rewardEvents} from '../services/rewardEvents';

// Import actual screens
import {MyWinsScreen} from '../screens/mywins';
import {ReferralScreen} from '../screens/referral';
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

  // State for reward popup notifications
  const [rewardQueue, setRewardQueue] = useState<RewardNotification[]>([]);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const rewardChecked = useRef(false);

  // Helper: move user tickets to past after extraction
  const moveTicketsToPast = useCallback((prizeId: string, wNumber: number, prizeName: string, prizeImage: string) => {
    const ticketsForPrize = getTicketsForPrize(prizeId);
    if (ticketsForPrize.length > 0) {
      const {activeTickets, pastTickets} = useTicketsStore.getState();
      const now = new Date().toISOString();
      const updatedUserTickets = ticketsForPrize.map(ticket => ({
        ...ticket,
        isWinner: ticket.ticketNumber === wNumber,
        wonAt: ticket.ticketNumber === wNumber ? now : undefined,
        prizeName: ticket.ticketNumber === wNumber ? prizeName : undefined,
        prizeImage: ticket.ticketNumber === wNumber ? prizeImage : undefined,
      }));
      const remainingActive = activeTickets.filter(t => t.prizeId !== prizeId);
      useTicketsStore.setState({
        activeTickets: remainingActive,
        pastTickets: [...updatedUserTickets, ...pastTickets],
      });
    }
  }, [getTicketsForPrize]);

  // Poll server once for extraction result (used as publisher for Firebase)
  const pollServerOnce = useCallback(async (prizeId: string): Promise<number | null> => {
    try {
      const response = await apiClient.get(`/draws/prize/${prizeId}?limit=1`);
      const draws = response.data?.data?.draws || [];
      if (draws.length > 0) {
        const latestDraw = draws[0];
        const drawTime = new Date(latestDraw.extractedAt || latestDraw.createdAt).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (latestDraw.status === 'completed' && drawTime > fiveMinutesAgo) {
          return latestDraw.winningNumber || 0;
        }
      }
    } catch (error) {
      console.log('[Extraction] Server poll error:', error);
    }
    return null;
  }, []);

  // Wait for extraction result using Firebase as single source of truth
  // Flow: Firebase listener + server poll race - first valid result wins
  // Server is the authority, Firebase is the distribution layer
  const waitForExtractionResult = useCallback(async (prize: Prize) => {
    // Mark prize as extracting locally
    markPrizeAsExtracting(prize.id);

    // Start the extraction animation
    startExtraction();

    const isGuestUser = token?.startsWith('guest_token_');
    const useMockMode = API_CONFIG.USE_MOCK_DATA || isGuestUser;

    const userTickets = getTicketsForPrize(prize.id);
    const userNumbers = userTickets.map(t => t.ticketNumber);
    const timerStartedAt = prize.timerStartedAt || '';

    let winningNumber = 0;
    let isWinner = false;

    if (useMockMode) {
      // MOCK/GUEST MODE: Check Firebase first - if another client already
      // simulated and published, use that result. Otherwise simulate and publish.
      if (timerStartedAt) {
        // Listen to Firebase for 2s - another client may have already published
        const firebaseListener = listenForDrawResult(prize.id, timerStartedAt, 2000);
        const firebaseResult = await firebaseListener.promise;
        firebaseListener.unsubscribe();

        if (firebaseResult) {
          // Another client already published - use their result (consistency!)
          winningNumber = firebaseResult.winningNumber;
          isWinner = userNumbers.includes(winningNumber);
          moveTicketsToPast(prize.id, winningNumber, prize.name, prize.imageUrl);
          console.log(`[Extraction] Mock: using Firebase result #${winningNumber}`);
        } else {
          // No result yet - this client simulates and publishes for everyone
          const result = simulateExtraction(prize.id, prize.name, prize.imageUrl);
          winningNumber = result.winningNumber || 0;
          isWinner = result.isWinner;
          publishDrawResult(prize.id, winningNumber, timerStartedAt);
          console.log(`[Extraction] Mock: simulated and published #${winningNumber}`);
        }
      } else {
        // No timerStartedAt - just simulate locally
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        const result = simulateExtraction(prize.id, prize.name, prize.imageUrl);
        winningNumber = result.winningNumber || 0;
        isWinner = result.isWinner;
      }
    } else {
      // PRODUCTION: Server is the sole authority for winning numbers.
      // Firebase is the distribution layer - first client to get the server
      // result publishes it, all others receive it instantly via Firebase.
      // NO local simulation fallback - prevents different users seeing different numbers.

      const firebaseListener = timerStartedAt
        ? listenForDrawResult(prize.id, timerStartedAt, 10000)
        : null;

      // Race: first non-null result from Firebase or server poll wins
      const resultNumber = await new Promise<number | null>((resolve) => {
        let settled = false;

        const settle = (num: number, source: string) => {
          if (!settled) {
            settled = true;
            firebaseListener?.unsubscribe();
            console.log(`[Extraction] Got result from ${source}: #${num}`);
            resolve(num);
          }
        };

        // 1. Firebase listener - receives result instantly when ANY client publishes
        if (firebaseListener) {
          firebaseListener.promise.then(result => {
            if (result && !settled) {
              settle(result.winningNumber, 'firebase');
            }
          });
        }

        // 2. Server poll - 5 attempts with increasing delays
        // If server responds, publish to Firebase for all other clients
        (async () => {
          const delays = [500, 1000, 1500, 2000, 2500];
          for (const delay of delays) {
            if (settled) return;
            await new Promise<void>(r => setTimeout(r, delay));
            if (settled) return;
            const result = await pollServerOnce(prize.id);
            if (result !== null) {
              // Publish to Firebase so all other clients get it instantly
              if (timerStartedAt) {
                publishDrawResult(prize.id, result, timerStartedAt);
              }
              settle(result, 'server');
              return;
            }
          }
        })();

        // 3. Overall timeout (10s) - safety net
        setTimeout(() => {
          if (!settled) {
            settled = true;
            firebaseListener?.unsubscribe();
            resolve(null);
          }
        }, 10000);
      });

      if (resultNumber !== null) {
        winningNumber = resultNumber;
        isWinner = userNumbers.includes(winningNumber);
        moveTicketsToPast(prize.id, winningNumber, prize.name, prize.imageUrl);
      } else {
        // 10s timeout - server extraction hasn't completed yet
        // Last chance: one more server poll
        console.log('[Extraction] Timeout - trying one last server poll...');
        const lastChance = await pollServerOnce(prize.id);
        if (lastChance !== null) {
          winningNumber = lastChance;
          isWinner = userNumbers.includes(winningNumber);
          moveTicketsToPast(prize.id, winningNumber, prize.name, prize.imageUrl);
          if (timerStartedAt) {
            publishDrawResult(prize.id, winningNumber, timerStartedAt);
          }
          console.log(`[Extraction] Last chance server poll succeeded: #${winningNumber}`);
        } else {
          // Server truly unavailable - extraction result unknown
          // Show 0 as winning number to indicate no result
          console.warn('[Extraction] No result from server after 10s - server may be down');
          winningNumber = 0;
          isWinner = false;
        }
      }
    }

    // Generate drawId for tracking
    const drawId = `draw_${prize.id}_${(prize.timerStartedAt || new Date().toISOString()).replace(/[^0-9]/g, '').slice(0, 14)}`;

    // If winner, add to wins
    if (isWinner && user && userTickets.length > 0) {
      addWin(prize.id, drawId, userTickets[0].id, user.id);
    }

    // Show the result modal
    showResult({
      isWinner,
      winningNumber,
      userNumbers,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeImage: prize.imageUrl,
    });

    // Mark extraction complete locally
    completePrizeExtraction(prize.id, winningNumber);

    // Update last seen draw timestamp
    AsyncStorage.setItem('rafflemania_last_seen_draw_timestamp', new Date().toISOString());

    // Clean up tickets and reset prize for next round
    setTimeout(() => {
      clearTicketsForPrize(prize.id);
      resetPrizeAfterExtraction(prize.id);
    }, 2000);
  }, [user, token, markPrizeAsExtracting, startExtraction, simulateExtraction, getTicketsForPrize, pollServerOnce, moveTicketsToPast, addWin, showResult, completePrizeExtraction, resetPrizeAfterExtraction, clearTicketsForPrize]);

  // Initialize
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Fetch pending reward notifications from server
  const fetchRewardNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/me/reward-notifications');
      const notifications = response.data?.data?.notifications || [];
      if (notifications.length > 0) {
        setRewardQueue(notifications);
        setShowRewardPopup(true);
      }
    } catch (error) {
      console.log('[Rewards] Error fetching reward notifications:', error);
    }
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

  // Check for pending reward notifications on app start (after auth)
  useEffect(() => {
    if (isAuthenticated && sessionActive && !rewardChecked.current) {
      rewardChecked.current = true;
      // Delay to let missed extractions show first
      setTimeout(() => {
        fetchRewardNotifications();
      }, 4000);
    }
    if (!isAuthenticated || !sessionActive) {
      rewardChecked.current = false;
    }
  }, [isAuthenticated, sessionActive, fetchRewardNotifications]);

  // Re-check missed extractions and rewards when app returns to foreground
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated || !sessionActive) return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check for missed extractions and rewards
        setTimeout(() => {
          fetchMissedExtractions();
        }, 1000);
        setTimeout(() => {
          fetchRewardNotifications();
        }, 3000);
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isAuthenticated, sessionActive, fetchMissedExtractions, fetchRewardNotifications]);

  // Handle reward popup dismiss - show next in queue or close
  const handleRewardPopupClose = useCallback(async () => {
    const current = rewardQueue[0];
    const remaining = rewardQueue.slice(1);

    // Mark as seen on server
    if (current) {
      try {
        await apiClient.post('/users/me/reward-notifications/seen', {ids: [current.id]});
      } catch (error) {
        console.log('[Rewards] Error marking notification as seen:', error);
      }
    }

    if (remaining.length > 0) {
      setRewardQueue(remaining);
      // Brief delay before showing next
      setShowRewardPopup(false);
      setTimeout(() => setShowRewardPopup(true), 400);
    } else {
      setRewardQueue([]);
      setShowRewardPopup(false);
      // Refresh user data to sync updated credits/XP from server
      useAuthStore.getState().refreshUserData();
    }
  }, [rewardQueue]);

  // Listen for real-time reward push notifications (online users)
  useEffect(() => {
    if (!isAuthenticated || !sessionActive) return;
    const unsubscribe = rewardEvents.subscribe(() => {
      fetchRewardNotifications();
    });
    return unsubscribe;
  }, [isAuthenticated, sessionActive, fetchRewardNotifications]);

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

        // Timer has expired - wait for server extraction result
        // Only trigger if scheduledAt just passed (within 60s) and this drawId hasn't been handled yet
        if (remainingSeconds === 0 && diffSeconds >= -60 && !extractedDrawIds.current.has(drawId)) {
          extractedDrawIds.current.add(drawId);
          waitForExtractionResult(prize);
        }

        // Stale timer cleanup: if expired by more than 60 seconds, the extraction
        // window has passed. Reset the prize to avoid stuck 0:00:00 timers.
        if (remainingSeconds === 0 && diffSeconds < -60 && !extractedDrawIds.current.has(drawId)) {
          extractedDrawIds.current.add(drawId);
          console.log(`[Timer] Stale countdown detected for prize ${prize.id} (expired ${Math.abs(diffSeconds)}s ago). Resetting.`);
          resetPrizeAfterExtraction(prize.id);
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
  }, [prizes, isAuthenticated, sessionActive, waitForExtractionResult]);

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

      {/* Reward Popup Modal - shown for bulk rewards */}
      {isAuthenticated && sessionActive && (
        <RewardPopupModal
          visible={showRewardPopup}
          reward={rewardQueue[0] || null}
          onClose={handleRewardPopupClose}
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
