import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Easing,
  Modal,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground, StreakModal, AdOrCreditsModal, ExtractionStartEffect, ExtractionResultModal} from '../../components/common';
import {useTicketsStore, usePrizesStore, useLevelStore, XP_REWARDS, useStreakStore, useCreditsStore, useAuthStore, ExtractionResult} from '../../store';
import {getTotalPoolTickets} from '../../services/mock';
import {useCountdown, setDebugCountdown, resetDebugCountdown} from '../../hooks/useCountdown';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
import {padNumber, formatTicketNumber} from '../../utils/formatters';

const {width, height} = Dimensions.get('window');

// Timer Card Component - Single digit card with flip animation
interface TimerCardProps {
  value: string;
}

const TimerCard: React.FC<TimerCardProps> = ({value}) => {
  const {neon} = useThemeColors();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      flipAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(flipAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setDisplayValue(value);
      }, 150);

      prevValue.current = value;
    }
  }, [value]);

  const rotateX = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });

  const scale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.95, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.timerCard,
        neon.glow,
        {
          transform: [{perspective: 400}, {rotateX}, {scale}],
        },
      ]}>
      <LinearGradient
        colors={['#2A2A2A', '#1A1A1A', '#0F0F0F']}
        style={styles.timerCardGradient}>
        <Text style={[styles.timerCardText, neon.textShadow]}>{displayValue}</Text>
        <View style={styles.timerCardLine} />
      </LinearGradient>
    </Animated.View>
  );
};

// Timer Unit Component
interface TimerUnitProps {
  value: string;
  label: string;
}

const TimerUnit: React.FC<TimerUnitProps> = ({value, label}) => {
  const digits = value.split('');
  return (
    <View style={styles.timerUnit}>
      <View style={styles.timerCards}>
        <TimerCard value={digits[0] || '0'} />
        <TimerCard value={digits[1] || '0'} />
      </View>
      <Text style={styles.timerLabel}>{label}</Text>
    </View>
  );
};

// Timer Separator
const TimerSeparator: React.FC = () => {
  const {neon} = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.timerSeparator, {opacity: pulseAnim}]}>
      <View style={[styles.separatorDot, neon.glowSubtle]} />
      <View style={[styles.separatorDot, neon.glowSubtle]} />
    </Animated.View>
  );
};

// Progress Bar Component for Prize
interface PrizeProgressBarProps {
  current: number;
  goal: number;
  prizeId: string;
  colors: any;
  neon: any;
}

const PrizeProgressBar: React.FC<PrizeProgressBarProps> = ({current, goal, prizeId, colors, neon}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  const prevPrizeId = useRef(prizeId);

  const progress = Math.min(current / goal, 1);
  const percentage = Math.round(progress * 100);

  useEffect(() => {
    // Reset animation when prize changes
    if (prevPrizeId.current !== prizeId) {
      progressAnim.setValue(0);
      prevPrizeId.current = prizeId;
    }

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, prizeId]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 2,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmerPosition.interpolate({
    inputRange: [-1, 2],
    outputRange: [-100, width + 100],
  });

  return (
    <View style={[styles.prizeProgressSection, {backgroundColor: colors.card}, neon.glowSubtle]}>
      <View style={styles.prizeProgressHeader}>
        <View style={styles.prizeProgressLabelRow}>
          <Ionicons name="trophy-outline" size={16} color={colors.primary} />
          <Text style={[styles.prizeProgressTitle, {color: colors.textMuted}]}>Progresso Premio</Text>
        </View>
        <Text style={[styles.prizeProgressPercentage, neon.textShadow]}>{percentage}%</Text>
      </View>

      <View style={[styles.prizeProgressBarBg, {backgroundColor: `${colors.primary}15`}]}>
        <Animated.View style={[styles.prizeProgressBarFill, {width: animatedWidth, backgroundColor: COLORS.primary}]}>
          <Animated.View
            style={[
              styles.prizeProgressShimmer,
              {transform: [{translateX: shimmerTranslate}]},
            ]}
          />
        </Animated.View>
      </View>

      <View style={styles.prizeProgressFooter}>
        <Text style={[styles.prizeProgressCount, {color: colors.textMuted}]}>
          <Text style={{color: colors.primary, fontWeight: '700'}}>{current.toLocaleString()}</Text>
          {' / '}
          {goal.toLocaleString()} Biglietti
        </Text>
      </View>
    </View>
  );
};

// Pulsing Dot
const PulsingDot: React.FC = () => {
  const {neon} = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return <Animated.View style={[styles.pulsingDot, neon.glowStrong, {opacity: pulseAnim}]} />;
};

interface HomeScreenProps {
  navigation: any;
}

// Ticket Success Modal Component
interface TicketModalInfo {
  ticketNumber: number;
  prizeName: string;
  userNumbers: number[];
  totalPoolTickets: number;
}

const TicketSuccessModal: React.FC<{
  visible: boolean;
  ticketInfo: TicketModalInfo | null;
  onClose: () => void;
}> = ({visible, ticketInfo, onClose}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ticketScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      ticketScaleAnim.setValue(0.8);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.sequence([
          Animated.spring(ticketScaleAnim, {
            toValue: 1.1,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(ticketScaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible]);

  if (!ticketInfo) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, {opacity: opacityAnim}]}>
        <Animated.View
          style={[
            styles.modalContent,
            {transform: [{scale: scaleAnim}]},
          ]}>
          {/* Success Icon */}
          <View style={styles.modalIconContainer}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              style={styles.modalIconGradient}>
              <Ionicons
                name="ticket"
                size={40}
                color={COLORS.white}
              />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>Nuovo Numero Ottenuto!</Text>

          {/* Ticket Number Card */}
          <Animated.View
            style={[
              styles.modalTicketCard,
              {transform: [{scale: ticketScaleAnim}]},
            ]}>
            <LinearGradient
              colors={[COLORS.primary, '#FF6B00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalTicketGradient}>
              <View style={styles.modalTicketContent}>
                <Text style={styles.modalTicketCode}>#{ticketInfo.ticketNumber}</Text>
                <Text style={styles.modalTicketPrize}>{ticketInfo.prizeName}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Good Luck Message */}
          <View style={styles.modalLuckContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.modalLuckText}>Buona fortuna!</Text>
            <Ionicons name="star" size={16} color="#FFD700" />
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>Continua</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Animated Step Indicator Component - pill style
interface StepIndicatorProps {
  currentIndex: number;
  totalCount: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({currentIndex, totalCount}) => {
  return (
    <View style={styles.stepIndicatorContainer}>
      {Array.from({length: totalCount}).map((_, index) => {
        const isActive = index === currentIndex;
        return (
          <View
            key={index}
            style={[
              styles.stepPill,
              isActive && styles.stepPillActive,
            ]}>
            {isActive && (
              <LinearGradient
                colors={[COLORS.primary, '#FF8500']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.stepPillGradient}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark, neon} = useThemeColors();
  const {
    fetchTickets,
    addTicket,
    incrementAdsWatched,
    getTicketsForPrize,
    getTicketNumbersForPrize,
    simulateExtraction,
    forceWinExtraction,
  } = useTicketsStore();
  const {prizes, currentDraw, fetchPrizes, fetchDraws, incrementAdsForPrize, moveToNextDraw, addWin} = usePrizesStore();
  const addXP = useLevelStore(state => state.addXP);
  const {currentStreak, checkAndUpdateStreak, getNextMilestone, hasClaimedToday} = useStreakStore();
  const {useCreditsForTicket} = useCreditsStore();
  const user = useAuthStore(state => state.user);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketInfo, setNewTicketInfo] = useState<TicketModalInfo | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakReward, setStreakReward] = useState<{xp: number; credits: number; isWeeklyBonus: boolean; isMilestone: boolean; milestoneDay?: number} | null>(null);
  const [showAdOrCreditsModal, setShowAdOrCreditsModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const isManualScroll = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showExtractionEffect, setShowExtractionEffect] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const wasWatchingLastMinute = useRef(false);
  const hasTriggeredExtraction = useRef(false);

  const {countdown, isExpired, isLastMinute} = useCountdown(currentDraw?.scheduledAt);

  // Track if user was watching during last minute
  useEffect(() => {
    if (isLastMinute) {
      wasWatchingLastMinute.current = true;
    }
  }, [isLastMinute]);

  // Get active prizes
  const activePrizes = prizes.filter(p => p.isActive);
  const currentPrize = activePrizes[currentPrizeIndex];

  // Handle timer reaching zero - only show extraction if user was watching
  useEffect(() => {
    if (isExpired && wasWatchingLastMinute.current && !hasTriggeredExtraction.current) {
      // Timer just expired while user was watching - show extraction effect
      hasTriggeredExtraction.current = true;
      setShowExtractionEffect(true);
    }
  }, [isExpired]);

  // Handle extraction animation complete - simulate win/lose
  const handleExtractionComplete = () => {
    setShowExtractionEffect(false);

    // Get current prize and simulate extraction
    const prize = activePrizes[currentPrizeIndex];
    if (prize) {
      // Get user's tickets before extraction
      const userTickets = getTicketsForPrize(prize.id);

      const result = simulateExtraction(prize.id, prize.name, prize.imageUrl);
      setExtractionResult(result);
      setShowResultModal(true);

      // If user won, add to wins list
      if (result.isWinner && currentDraw && userTickets.length > 0 && user) {
        // Find the winning ticket by matching the winning number
        const winningTicket = userTickets.find(t => t.ticketNumber === result.winningNumber);
        if (winningTicket) {
          addWin(prize.id, currentDraw.id, winningTicket.id, user.id);
        }
      }

      // Reset debug countdown so timer uses the new draw's date
      resetDebugCountdown();

      // Move to next draw immediately so timer restarts
      moveToNextDraw();

      // Reset extraction state
      wasWatchingLastMinute.current = false;
      hasTriggeredExtraction.current = false;
    }
  };

  // Create infinite carousel data with clones at start and end
  // Pattern: [lastClone, item0, item1, ..., itemN, firstClone]
  const infiniteData = activePrizes.length > 0
    ? [activePrizes[activePrizes.length - 1], ...activePrizes, activePrizes[0]]
    : [];

  const slideWidth = width - 48;

  useEffect(() => {
    fetchTickets();
    fetchPrizes();
    fetchDraws();

    // Check and show streak modal if not claimed today
    if (!hasClaimedToday) {
      const reward = checkAndUpdateStreak();
      if (reward) {
        setStreakReward(reward);
        setTimeout(() => {
          setShowStreakModal(true);
        }, 500);
      }
    }
  }, []);

  // Initialize scroll position to first real item (index 1 in infiniteData)
  useEffect(() => {
    if (infiniteData.length > 2 && scrollViewRef.current) {
      // Start at position 1 (first real item, after the clone)
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({x: slideWidth, animated: false});
      }, 50);
    }
  }, [activePrizes.length]);

  // Auto-scroll with infinite loop
  useEffect(() => {
    if (activePrizes.length === 0) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        if (!isManualScroll.current && scrollViewRef.current) {
          // Calculate next position in infiniteData (offset by 1 for the clone)
          const nextInfiniteIndex = currentPrizeIndex + 2; // +1 for clone, +1 for next
          scrollViewRef.current.scrollTo({
            x: nextInfiniteIndex * slideWidth,
            animated: true,
          });
        }
      }, 5000);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentPrizeIndex, activePrizes.length]);

  const handleScrollBegin = () => {
    isManualScroll.current = true;
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    // infiniteData index (0 = lastClone, 1 = first real, ..., n = last real, n+1 = firstClone)
    const infiniteIndex = Math.round(contentOffsetX / slideWidth);
    // Convert to real index (subtract 1 for the leading clone)
    const realIndex = infiniteIndex - 1;

    if (realIndex >= 0 && realIndex < activePrizes.length && realIndex !== currentPrizeIndex) {
      setCurrentPrizeIndex(realIndex);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const infiniteIndex = Math.round(contentOffsetX / slideWidth);
    const lastRealIndex = activePrizes.length; // Position of last real item in infiniteData

    // If we scrolled to the first clone (index 0), instantly jump to the last real item
    if (infiniteIndex === 0) {
      scrollViewRef.current?.scrollTo({x: lastRealIndex * slideWidth, animated: false});
      setCurrentPrizeIndex(activePrizes.length - 1);
    }
    // If we scrolled to the last clone (after all real items), instantly jump to first real item
    else if (infiniteIndex === infiniteData.length - 1) {
      scrollViewRef.current?.scrollTo({x: slideWidth, animated: false});
      setCurrentPrizeIndex(0);
    }
    // Normal case: update to real index
    else {
      const realIndex = infiniteIndex - 1;
      if (realIndex >= 0 && realIndex < activePrizes.length) {
        setCurrentPrizeIndex(realIndex);
      }
    }

    // Resume auto-scroll after manual interaction
    isManualScroll.current = false;
  };

  // Show the ad or credits choice modal
  const handleShowAdOrCreditsModal = () => {
    if (!currentPrize) return;
    setShowAdOrCreditsModal(true);
  };

  // Handle watching ad (called from modal)
  const handleWatchAd = async () => {
    if (!currentPrize) return;

    setShowAdOrCreditsModal(false);
    setIsWatchingAd(true);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Increment ads for current prize
    incrementAdsForPrize(currentPrize.id);
    incrementAdsWatched();

    // Add XP for watching ad
    addXP(XP_REWARDS.WATCH_AD);

    if (currentDraw) {
      // Add new ticket and get the assigned number
      const newTicket = addTicket('ad', currentDraw.id, currentPrize.id);

      // Get all user's numbers for this prize (including the new one)
      const userNumbers = getTicketNumbersForPrize(currentPrize.id);
      const totalPool = getTotalPoolTickets(currentPrize.id);

      setNewTicketInfo({
        ticketNumber: newTicket.ticketNumber,
        prizeName: currentPrize.name,
        userNumbers,
        totalPoolTickets: totalPool,
      });
      setShowTicketModal(true);
    }

    setIsWatchingAd(false);
  };

  // Handle using credits (called from modal)
  const handleUseCredits = async () => {
    if (!currentPrize || !currentDraw) return;

    setShowAdOrCreditsModal(false);

    const success = await useCreditsForTicket();
    if (!success) {
      Alert.alert('Errore', 'Crediti insufficienti');
      return;
    }

    // Increment ads for current prize (counts as participation)
    incrementAdsForPrize(currentPrize.id);

    // Add new ticket and get the assigned number
    const newTicket = addTicket('credits', currentDraw.id, currentPrize.id);

    // Get all user's numbers for this prize (including the new one)
    const userNumbers = getTicketNumbersForPrize(currentPrize.id);
    const totalPool = getTotalPoolTickets(currentPrize.id);

    setNewTicketInfo({
      ticketNumber: newTicket.ticketNumber,
      prizeName: currentPrize.name,
      userNumbers,
      totalPoolTickets: totalPool,
    });
    setShowTicketModal(true);
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    setNewTicketInfo(null);
  };

  if (activePrizes.length === 0) {
    return (
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, {color: colors.textMuted}]}>Caricamento premi...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <AnimatedBackground />

      {/* Header - Removed logo and profile icon */}

      {/* Main Content - Centered Layout */}
      <View style={styles.mainContent}>
        {/* Timer Section - Top */}
        <View style={styles.timerSection}>
          <View style={styles.liveIndicator}>
            <PulsingDot />
            <Text style={styles.liveText}>
              {isExpired ? 'ESTRAZIONE LIVE' : 'PROSSIMA ESTRAZIONE'}
            </Text>
          </View>

          {!isExpired && (
            <View style={styles.timerContainer}>
              <TimerUnit value={padNumber(countdown.hours)} label="ORE" />
              <TimerSeparator />
              <TimerUnit value={padNumber(countdown.minutes)} label="MIN" />
              <TimerSeparator />
              <TimerUnit value={padNumber(countdown.seconds)} label="SEC" />
            </View>
          )}
        </View>

        {/* Prize Carousel - Infinite Loop */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={handleScrollBegin}
            onMomentumScrollEnd={handleScrollEnd}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
            snapToInterval={slideWidth}
            snapToAlignment="start"
            bounces={false}>
            {infiniteData.map((prize, index) => (
              <View key={`${prize.id}-${index}`} style={styles.prizeCard}>
                <Image
                  source={{uri: prize.imageUrl}}
                  style={styles.prizeImage}
                  resizeMode="contain"
                />
                <Text style={[styles.prizeName, {color: colors.text}]}>{prize.name}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Step Indicator */}
          <StepIndicator
            currentIndex={currentPrizeIndex}
            totalCount={activePrizes.length}
          />
        </View>

        {/* Prize Progress Bar */}
        {currentPrize && (
          <PrizeProgressBar
            current={currentPrize.currentAds}
            goal={currentPrize.goalAds}
            prizeId={currentPrize.id}
            colors={colors}
            neon={neon}
          />
        )}

        {/* Watch Ad Button - Bottom Position */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.watchButton,
              neon.glowStrong,
              isWatchingAd && styles.watchButtonDisabled,
            ]}
            onPress={handleShowAdOrCreditsModal}
            disabled={isWatchingAd}
            activeOpacity={0.8}>
            <Ionicons
              name={isWatchingAd ? 'hourglass' : 'play-circle'}
              size={24}
              color={COLORS.white}
            />
            <Text style={[styles.watchButtonText, neon.textShadow]}>
              {isWatchingAd ? 'Guardando...' : 'Guarda Ads'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ad or Credits Choice Modal */}
      <AdOrCreditsModal
        visible={showAdOrCreditsModal}
        userCredits={user?.credits ?? 0}
        prizeName={currentPrize?.name ?? ''}
        onWatchAd={handleWatchAd}
        onUseCredits={handleUseCredits}
        onGoToShop={() => {
          setShowAdOrCreditsModal(false);
          navigation.navigate('Credits');
        }}
        onClose={() => setShowAdOrCreditsModal(false)}
      />

      {/* Ticket Success Modal */}
      <TicketSuccessModal
        visible={showTicketModal}
        ticketInfo={newTicketInfo}
        onClose={handleCloseModal}
      />

      {/* Streak Modal */}
      <StreakModal
        visible={showStreakModal}
        currentStreak={currentStreak}
        reward={streakReward}
        nextMilestone={getNextMilestone()}
        daysUntilWeeklyBonus={7 - (currentStreak % 7)}
        onClose={() => setShowStreakModal(false)}
      />

      {/* Extraction Start Effect */}
      <ExtractionStartEffect
        visible={showExtractionEffect}
        onAnimationComplete={handleExtractionComplete}
      />

      {/* Extraction Result Modal - Win/Lose */}
      <ExtractionResultModal
        visible={showResultModal}
        isWinner={extractionResult?.isWinner || false}
        prizeName={extractionResult?.prizeName}
        prizeImage={extractionResult?.prizeImage}
        winningNumber={extractionResult?.winningNumber}
        userNumbers={extractionResult?.userNumbers}
        onClose={() => {
          setShowResultModal(false);
          setExtractionResult(null);
        }}
      />

      {/* Debug Controls - Only in DEV mode */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setDebugCountdown(65)}>
            <Text style={styles.debugButtonText}>1:05</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setDebugCountdown(3)}>
            <Text style={styles.debugButtonText}>0:03</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.debugButton, {backgroundColor: 'rgba(0, 200, 0, 0.8)'}]}
            onPress={() => {
              const prize = currentPrize;
              if (prize && currentDraw && user) {
                // Get user's tickets before forcing win
                const userTickets = getTicketsForPrize(prize.id);

                if (userTickets.length === 0) {
                  return; // No tickets to win with
                }

                // Force win extraction - this properly marks the ticket as winner
                const result = forceWinExtraction(prize.id, prize.name, prize.imageUrl);

                // Add to wins list using the first ticket
                addWin(prize.id, currentDraw.id, userTickets[0].id, user.id);

                setExtractionResult(result);
                setShowResultModal(true);

                // Reset and move to next draw
                resetDebugCountdown();
                moveToNextDraw();
              }
            }}>
            <Text style={styles.debugButtonText}>Vinto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.debugButton, {backgroundColor: 'rgba(100, 100, 100, 0.8)'}]}
            onPress={() => {
              const prize = currentPrize;
              const userNumbers = prize ? getTicketNumbersForPrize(prize.id) : [];
              setExtractionResult({
                isWinner: false,
                winningNumber: 999,
                userNumbers,
                prizeName: prize?.name,
              });
              setShowResultModal(true);
            }}>
            <Text style={styles.debugButtonText}>Perso</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 24,
    paddingBottom: SPACING.xs,
  },
  logoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextRaffle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  logoTextMania: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  profileButton: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 110,
    zIndex: 1,
  },
  // Carousel
  carouselContainer: {
    height: height * 0.38,
    marginTop: 0,
  },
  carouselContent: {
    paddingHorizontal: 24,
  },
  prizeCard: {
    width: width - 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImage: {
    width: width * 0.65,
    height: height * 0.28,
    marginBottom: 4,
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  // Step Indicator - pill style
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -10,
  },
  stepPill: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  stepPillActive: {
    width: 40,
  },
  stepPillGradient: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    marginBottom: 40,
  },
  // Timer
  timerSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    marginBottom: SPACING.sm,
    zIndex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  liveText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
  },
  timerUnit: {
    alignItems: 'center',
  },
  timerCards: {
    flexDirection: 'row',
    gap: 4,
  },
  timerCard: {
    width: 42,
    height: 54,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  timerCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerCardText: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
  timerCardLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timerLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
    marginTop: 6,
    letterSpacing: 1,
  },
  timerSeparator: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  separatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  // Prize Progress Bar
  prizeProgressSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  prizeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  prizeProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prizeProgressTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prizeProgressPercentage: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  prizeProgressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  prizeProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  prizeProgressGradientFill: {
    flex: 1,
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  prizeProgressShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{skewX: '-25deg'}],
  },
  prizeProgressFooter: {
    alignItems: 'center',
  },
  prizeProgressCount: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Watch Button
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    gap: 10,
    minHeight: 52,
  },
  watchButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  watchButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconContainer: {
    marginBottom: SPACING.lg,
  },
  modalIconGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    includeFontPadding: false,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalTicketCard: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  modalTicketGradient: {
    borderRadius: RADIUS.lg,
  },
  modalTicketContent: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTicketCode: {
    fontSize: 42,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalTicketPrize: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  modalLuckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  modalLuckText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#000000',
  },
  modalNumbersSummary: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  modalNumbersTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  modalNumbersList: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  modalPoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  modalPoolText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  modalCloseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalCloseButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  // Boost Modal Styles - Same as PrizesScreen
  modalBoostCard: {
    width: '100%',
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  modalBoostGradient: {
    borderRadius: RADIUS.xl,
  },
  modalBoostContent: {
    padding: SPACING.lg,
  },
  modalBoostStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalBoostStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalBoostStatNumber: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  modalBoostStatText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  modalBoostStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: SPACING.sm,
  },
  modalBoostPrizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalBoostPrizeName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  // Debug Controls
  debugContainer: {
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 9998,
  },
  debugButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  debugButtonReset: {
    backgroundColor: 'rgba(0, 150, 0, 0.8)',
  },
  debugButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default HomeScreen;
