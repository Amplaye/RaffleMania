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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground, StreakModal} from '../../components/common';
import {useTicketsStore, usePrizesStore, useLevelStore, XP_REWARDS, useStreakStore, TICKET_PROBABILITY_BONUS} from '../../store';
import {useCountdown} from '../../hooks/useCountdown';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
import {padNumber} from '../../utils/formatters';

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
        <Animated.View style={[styles.prizeProgressBarFill, {width: animatedWidth}]}>
          <LinearGradient
            colors={['#FF8C00', '#FF6B00', '#FF5500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.prizeProgressGradient}
          />
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
  ticketCode: string;
  prizeName: string;
  isPrimaryTicket: boolean;
  totalTickets: number;
  probabilityBonus: number;
}

const TicketSuccessModal: React.FC<{
  visible: boolean;
  ticketInfo: TicketModalInfo | null;
  onClose: () => void;
}> = ({visible, ticketInfo, onClose}) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ticketScaleAnim = useRef(new Animated.Value(0.8)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      ticketScaleAnim.setValue(0.8);
      confettiAnim.setValue(0);

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

        Animated.loop(
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ).start();
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
          {/* Success Icon - Only for Primary Ticket */}
          {ticketInfo.isPrimaryTicket && (
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
          )}

          {ticketInfo.isPrimaryTicket ? (
            <>
              {/* Title for Primary Ticket */}
              <Text style={styles.modalTitle}>Biglietto Ottenuto!</Text>
              <Text style={styles.modalSubtitle}>Hai il tuo biglietto per l'estrazione</Text>

              {/* Ticket Card */}
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
                  <View style={styles.modalTicketHeader}>
                    <Ionicons name="ticket" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.modalTicketLabel}>CODICE BIGLIETTO</Text>
                  </View>
                  <Text style={styles.modalTicketCode}>{ticketInfo.ticketCode}</Text>
                  <View style={styles.modalTicketDivider} />
                  <View style={styles.modalTicketPrizeRow}>
                    <Ionicons name="gift" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.modalTicketPrize}>{ticketInfo.prizeName}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </>
          ) : (
            <>
              {/* Title for Duplicate Ticket - Inline */}
              <Text style={styles.modalTitle}>Chance Aumentata!</Text>

              {/* Boost Card - Compact Design */}
              <Animated.View
                style={[
                  styles.modalBoostCard,
                  {transform: [{scale: ticketScaleAnim}]},
                ]}>
                <LinearGradient
                  colors={['#00B894', '#00A085']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.modalBoostGradient}>
                  {/* Stats Row - Only Biglietti and Chance */}
                  <View style={styles.modalBoostStatsRow}>
                    <View style={styles.modalBoostStatItem}>
                      <Text style={styles.modalBoostStatNumber}>{ticketInfo.totalTickets}</Text>
                      <Text style={styles.modalBoostStatText}>Biglietti</Text>
                    </View>
                    <View style={styles.modalBoostStatDivider} />
                    <View style={styles.modalBoostStatItem}>
                      <Text style={styles.modalBoostStatNumber}>{(ticketInfo.totalTickets * 0.5).toFixed(1)}%</Text>
                      <Text style={styles.modalBoostStatText}>Chance</Text>
                    </View>
                  </View>

                  {/* Prize Name */}
                  <View style={styles.modalBoostPrizeRow}>
                    <Ionicons name="gift" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.modalBoostPrizeName}>{ticketInfo.prizeName}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </>
          )}

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
    getPrimaryTicketForPrize,
  } = useTicketsStore();
  const {prizes, currentDraw, fetchPrizes, fetchDraws, incrementAdsForPrize} = usePrizesStore();
  const addXP = useLevelStore(state => state.addXP);
  const {currentStreak, checkAndUpdateStreak, getNextMilestone, hasClaimedToday} = useStreakStore();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketInfo, setNewTicketInfo] = useState<TicketModalInfo | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakReward, setStreakReward] = useState<{xp: number; credits: number; isWeeklyBonus: boolean; isMilestone: boolean; milestoneDay?: number} | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isManualScroll = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const {countdown, isExpired} = useCountdown(currentDraw?.scheduledAt);

  // Get active prizes
  const activePrizes = prizes.filter(p => p.isActive);
  const currentPrize = activePrizes[currentPrizeIndex];

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

  const handleWatchAd = async () => {
    if (!currentPrize) return;

    setIsWatchingAd(true);
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Increment ads for current prize
    incrementAdsForPrize(currentPrize.id);
    incrementAdsWatched();

    // Add XP for watching ad
    addXP(XP_REWARDS.WATCH_AD);

    if (currentDraw) {
      // Check if this will be the first ticket (before adding)
      const existingPrimaryTicket = getPrimaryTicketForPrize(currentPrize.id);
      const isFirstTicket = !existingPrimaryTicket;

      const newTicket = addTicket('ad', currentDraw.id, currentPrize.id);

      // Get updated ticket count after adding
      const newTicketCount = getTicketsForPrize(currentPrize.id);

      setNewTicketInfo({
        // If boost ticket, show the existing primary ticket code
        ticketCode: isFirstTicket ? newTicket.uniqueCode : (existingPrimaryTicket?.uniqueCode || ''),
        prizeName: currentPrize.name,
        isPrimaryTicket: isFirstTicket,
        totalTickets: newTicketCount,
        probabilityBonus: 0.5, // Each ticket gives +0.5%
      });
      setShowTicketModal(true);
    }

    setIsWatchingAd(false);
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
      <AnimatedBackground particleCount={6} />

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
            onPress={handleWatchAd}
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
    paddingTop: 50,
    marginBottom: SPACING.sm,
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
    width: 44,
    height: 56,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  timerCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerCardText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
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
  prizeProgressGradient: {
    flex: 1,
    borderRadius: 4,
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
    paddingVertical: 16,
    borderRadius: RADIUS.xl,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  watchButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  watchButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIconContainer: {
    marginBottom: SPACING.lg,
  },
  modalIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
    padding: SPACING.lg,
  },
  modalTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  modalTicketLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  modalTicketCode: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  modalTicketDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: SPACING.md,
  },
  modalTicketPrizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTicketPrize: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.white,
  },
  modalLuckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  modalLuckText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  modalCloseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalCloseButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Boost Modal Styles - Compact Design
  modalBoostCard: {
    width: '100%',
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#00B894',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBoostGradient: {
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
});

export default HomeScreen;
