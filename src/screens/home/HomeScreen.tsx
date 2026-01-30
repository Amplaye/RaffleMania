import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground, StreakModal, ExtractionResultModal, UrgencyBorderEffect, ExtractionStartEffect, FlipCountdownTimer, TicketSuccessModal, TicketSuccessInfo} from '../../components/common';
import {getTotalPoolTickets} from '../../services/mock';
import {useTicketsStore, usePrizesStore, useLevelStore, useStreakStore, useCreditsStore, useAuthStore, useSettingsStore, useExtractionStore, DAILY_LIMITS, getUrgentThresholdForPrize, BETTING_LOCK_SECONDS} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width, height} = Dimensions.get('window');
const SLIDE_WIDTH = width;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {fetchTickets, addTicket, addTicketsBatch, incrementAdsWatched, canPurchaseTicket, getTicketsPurchasedToday, getAdCooldownRemaining, checkAndResetDaily, resetDailyLimit} = useTicketsStore();
  const {prizes, fetchPrizes, fetchDraws, incrementAdsForPrize, fillPrizeToGoal, startTimerForPrize} = usePrizesStore();
  const {addXPForAd, addXPForTicket} = useLevelStore();
  const {currentStreak, checkAndUpdateStreak, getNextMilestone, hasClaimedToday, _hasHydrated} = useStreakStore();
  const {useCreditsForTickets: spendCreditsForTickets, addCredits} = useCreditsStore();
  const user = useAuthStore(state => state.user);
  const refreshUserData = useAuthStore(state => state.refreshUserData);
  const {fetchSettings} = useSettingsStore();
  const {simulateExtraction, getTicketNumbersForPrize} = useTicketsStore();
  const {showResultModal, extractionResult, showResult, hideResult} = useExtractionStore();
  const {markPrizeAsExtracting, completePrizeExtraction, resetPrizeAfterExtraction} = usePrizesStore();

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isBuyingTicket, setIsBuyingTicket] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakReward, setStreakReward] = useState<{xp: number; credits: number; isWeeklyBonus: boolean; isMilestone: boolean; milestoneDay?: number} | null>(null);
  const [ticketsPurchasedToday, setTicketsPurchasedToday] = useState(0);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [canBuyTicket, setCanBuyTicket] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showExtractionEffect, setShowExtractionEffect] = useState(false);
  const [showTicketSuccessModal, setShowTicketSuccessModal] = useState(false);
  const [ticketSuccessInfo, setTicketSuccessInfo] = useState<TicketSuccessInfo | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Get active prizes only
  const activePrizes = prizes.filter(p => p.isActive);
  const currentPrize = activePrizes[currentSlideIndex] || null;

  useEffect(() => {
    checkAndResetDaily();
    fetchTickets();
    fetchPrizes();
    fetchDraws();
    fetchSettings();
  }, []);

  // Check streak
  useEffect(() => {
    if (!_hasHydrated) return;
    const checkStreak = async () => {
      if (!hasClaimedToday) {
        const reward = await checkAndUpdateStreak();
        if (reward) {
          setStreakReward(reward);
          setTimeout(() => setShowStreakModal(true), 500);
        }
      }
    };
    checkStreak();
  }, [_hasHydrated]);

  // Update ticket data
  useEffect(() => {
    const updateTicketData = () => {
      setTicketsPurchasedToday(getTicketsPurchasedToday());
      setCooldownMinutes(getAdCooldownRemaining());
      setCanBuyTicket(canPurchaseTicket());
    };
    updateTicketData();
    const interval = setInterval(updateTicketData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!currentPrize || currentPrize.timerStatus !== 'countdown' || !currentPrize.scheduledAt) {
      setCountdownSeconds(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const scheduledTime = new Date(currentPrize.scheduledAt!).getTime();
      const diff = Math.max(0, Math.floor((scheduledTime - now) / 1000));
      setCountdownSeconds(diff);

      // When countdown reaches 0, trigger extraction
      if (diff <= 0) {
        handleExtraction();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentPrize?.timerStatus, currentPrize?.scheduledAt, currentPrize?.id]);

  // Handle extraction when timer ends
  const handleExtraction = () => {
    if (!currentPrize) return;

    // Mark prize as extracting and show full-screen effect
    markPrizeAsExtracting(currentPrize.id);
    setShowExtractionEffect(true);
  };

  // Called when extraction animation completes
  const onExtractionAnimationComplete = () => {
    if (!currentPrize) return;

    // Hide the extraction effect
    setShowExtractionEffect(false);

    // Simulate the extraction
    const result = simulateExtraction(currentPrize.id, currentPrize.name, currentPrize.imageUrl);

    // Get user numbers for display
    const userNumbers = getTicketNumbersForPrize(currentPrize.id);

    // Show result with all data
    showResult({
      ...result,
      userNumbers: userNumbers.length > 0 ? userNumbers : result.userNumbers,
    });

    // Complete the extraction in prizes store
    if (result.isWinner) {
      completePrizeExtraction(currentPrize.id, result.winningNumber || 0);
    } else {
      // Reset prize for new round
      resetPrizeAfterExtraction(currentPrize.id);
    }
  };

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const getDrawIdForPrize = (prizeId: string, timerStartedAt?: string) => {
    const timestamp = timerStartedAt || new Date().toISOString();
    return `draw_${prizeId}_${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setCurrentSlideIndex(slideIndex);
  };

  const handlePrizePress = () => {
    if (currentPrize) {
      navigation.navigate('PrizeDetail', {prizeId: currentPrize.id});
    }
  };

  // Calculate remaining tickets for today
  const remainingTicketsToday = DAILY_LIMITS.MAX_TICKETS_PER_DAY - ticketsPurchasedToday;

  // Get available ticket quantities based on remaining daily limit and credits
  const getTicketOptions = () => {
    const userCredits = user?.credits ?? 0;
    const options: number[] = [];

    // x1 always available if at least 1 remaining
    if (remainingTicketsToday >= 1 && userCredits >= 1) {
      options.push(1);
    }

    // x5 or less if near limit
    if (remainingTicketsToday >= 2) {
      const qty5 = Math.min(5, remainingTicketsToday, userCredits);
      if (qty5 > 1) {
        options.push(qty5);
      }
    }

    // x10 or less if near limit
    if (remainingTicketsToday >= 6) {
      const qty10 = Math.min(10, remainingTicketsToday, userCredits);
      if (qty10 > 5) {
        options.push(qty10);
      }
    }

    return options;
  };

  // Open ticket selection modal
  const handleOpenTicketModal = () => {
    if (!currentPrize || !canBuyTicket) return;
    if ((user?.credits ?? 0) < 1) {
      Alert.alert('Crediti insufficienti', 'Hai bisogno di almeno 1 credito per riscattare un biglietto.');
      return;
    }
    setShowTicketModal(true);
  };

  // Riscatta biglietti con crediti (quantità variabile) - ATOMIC BATCH
  const handleBuyTicketsWithCredits = async (quantity: number) => {
    if (!currentPrize || !canBuyTicket) return;
    if ((user?.credits ?? 0) < quantity) {
      Alert.alert('Crediti insufficienti', `Hai bisogno di almeno ${quantity} crediti per riscattare ${quantity} biglietti.`);
      return;
    }

    setShowTicketModal(false);
    setIsBuyingTicket(true);

    // Deduct all credits at once (no flickering)
    const creditsDeducted = spendCreditsForTickets(quantity);
    if (!creditsDeducted) {
      setIsBuyingTicket(false);
      Alert.alert('Errore', 'Crediti insufficienti.');
      return;
    }

    try {
      // ATOMIC BATCH: Richiede tutti i biglietti in un'unica operazione
      // Garantisce numeri univoci anche con acquisti concorrenti
      const tickets = await addTicketsBatch('credits', currentPrize.id, currentPrize.timerStartedAt, quantity);
      const successCount = tickets.length;

      // Update progress bar for each ticket
      for (let i = 0; i < successCount; i++) {
        incrementAdsForPrize(currentPrize.id);
      }

      // XP per ogni biglietto
      for (let i = 0; i < successCount; i++) {
        const levelUpResult = addXPForTicket();
        if (levelUpResult) {
          addCredits(levelUpResult.creditReward, 'level_up');
        }
      }

      console.log(`[HomeScreen] Batch purchase completed: ${successCount} tickets with numbers:`,
        tickets.map(t => t.ticketNumber));

      // Refresh ticket count from store
      setTicketsPurchasedToday(getTicketsPurchasedToday());
      setCanBuyTicket(canPurchaseTicket());

      // Get all user numbers for this prize and show success modal
      const allUserNumbers = getTicketNumbersForPrize(currentPrize.id);
      const totalPool = getTotalPoolTickets(currentPrize.id);

      setTicketSuccessInfo({
        ticketNumbers: tickets.map(t => t.ticketNumber),
        prizeName: currentPrize.name,
        totalUserNumbers: allUserNumbers,
        totalPoolTickets: totalPool,
      });
      setShowTicketSuccessModal(true);
    } catch (error) {
      console.error('[HomeScreen] Batch ticket purchase failed:', error);
      // Refund credits if batch purchase failed
      addCredits(quantity, 'other');
      Alert.alert('Errore', 'Impossibile riscattare i biglietti.');
    }

    setIsBuyingTicket(false);
    refreshUserData().catch(() => {});
  };

  // Guarda pubblicità
  const handleWatchAd = async () => {
    if (!currentPrize || !canBuyTicket) return;

    setIsWatchingAd(true);
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    incrementAdsForPrize(currentPrize.id);
    incrementAdsWatched();

    // XP per ads
    const levelUpResult = addXPForAd();
    if (levelUpResult) {
      addCredits(levelUpResult.creditReward, 'level_up');
    }

    const drawId = getDrawIdForPrize(currentPrize.id, currentPrize.timerStartedAt);
    const newTicket = await addTicket('ad', drawId, currentPrize.id);

    // XP per biglietto
    const ticketLevelUp = addXPForTicket();
    if (ticketLevelUp) {
      addCredits(ticketLevelUp.creditReward, 'level_up');
    }

    // Show success modal
    const allUserNumbers = getTicketNumbersForPrize(currentPrize.id);
    const totalPool = getTotalPoolTickets(currentPrize.id);

    setTicketSuccessInfo({
      ticketNumbers: [newTicket.ticketNumber],
      prizeName: currentPrize.name,
      totalUserNumbers: allUserNumbers,
      totalPoolTickets: totalPool,
    });
    setShowTicketSuccessModal(true);

    refreshUserData();
    setIsWatchingAd(false);
  };

  // Progress bar data
  const progress = currentPrize ? Math.min(currentPrize.currentAds / currentPrize.goalAds, 1) : 0;
  const percentage = Math.round(progress * 100);
  const ticketsRemaining = currentPrize ? currentPrize.goalAds - currentPrize.currentAds : 0;

  // Check if betting is locked (last 30 seconds)
  const isBettingLocked = countdownSeconds !== null && countdownSeconds <= BETTING_LOCK_SECONDS;

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <AnimatedBackground />

      <View style={styles.content}>
        {/* Banner Pubblicitario */}
        <View style={[styles.bannerContainer, {backgroundColor: colors.card}]}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIcon}>
              <Ionicons name="megaphone" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, {color: colors.text}]}>Il tuo brand qui!</Text>
              <Text style={[styles.bannerSubtitle, {color: colors.textMuted}]}>Sponsorizza la tua azienda</Text>
            </View>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>AD</Text>
            </View>
          </View>
        </View>

        {/* Top Bar: Progress + Buy Ticket Button */}
        <View style={[styles.topBar, {backgroundColor: colors.card}]}>
          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Ionicons name="trophy" size={16} color={COLORS.primary} />
                <Text style={[styles.progressLabel, {color: colors.text}]}>
                  {currentPrize?.timerStatus === 'countdown' ? 'Estrazione in corso!' : 'Progresso Premio'}
                </Text>
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressPercentage}>{percentage}%</Text>
              </View>
            </View>
            <View style={[styles.progressBarBg, {backgroundColor: `${COLORS.primary}15`}]}>
              <LinearGradient
                colors={[COLORS.primary, '#FF8500']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.progressBarFill, {width: `${percentage}%`}]}
              />
            </View>
            <Text style={[styles.progressSubtext, {color: colors.textMuted}]}>
              {currentPrize?.timerStatus === 'countdown'
                ? 'Il timer è partito!'
                : `${ticketsRemaining} biglietti all'estrazione`}
            </Text>
          </View>

          {/* Buy Ticket Button */}
          <TouchableOpacity
            style={[styles.buyTicketButton, (!canBuyTicket || !currentPrize || isBettingLocked) && styles.buttonDisabled]}
            onPress={handleOpenTicketModal}
            disabled={isBuyingTicket || !canBuyTicket || !currentPrize || isBettingLocked}
            activeOpacity={0.8}>
            <LinearGradient
              colors={canBuyTicket && currentPrize && !isBettingLocked ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.buyTicketGradient}>
              <Ionicons name="ticket" size={22} color={COLORS.white} />
              <Text style={styles.buyTicketText}>
                {isBettingLocked ? 'PUNTATE CHIUSE' : isBuyingTicket ? 'RISCATTO...' : 'RISCATTA BIGLIETTO'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Debug Buttons - Hidden when timer is active */}
        {currentPrize?.timerStatus !== 'countdown' && currentPrize?.timerStatus !== 'extracting' && (
          <View style={styles.debugContainer}>
            <TouchableOpacity
              style={[styles.debugButton, {backgroundColor: colors.card}]}
              onPress={() => {
                resetDailyLimit();
                setTicketsPurchasedToday(0);
                setCanBuyTicket(true);
                Alert.alert('Debug', 'Limite biglietti giornaliero resettato!');
              }}
              activeOpacity={0.7}>
              <Text style={[styles.debugButtonText, {color: colors.text}]}>RESET LIMITE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.debugButton, {backgroundColor: colors.card}]}
              onPress={() => {
                if (currentPrize) {
                  fillPrizeToGoal(currentPrize.id);
                  Alert.alert('Debug', `Biglietti impostati al massimo (${currentPrize.goalAds}) e timer partito!`);
                }
              }}
              activeOpacity={0.7}>
              <Text style={[styles.debugButtonText, {color: colors.text}]}>MAX + TIMER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.debugButton, {backgroundColor: colors.card}]}
              onPress={() => {
                if (currentPrize) {
                  startTimerForPrize(currentPrize.id, 10);
                  Alert.alert('Debug', 'Timer impostato a 10 secondi e avviato!');
                }
              }}
              activeOpacity={0.7}>
              <Text style={[styles.debugButtonText, {color: colors.text}]}>TIMER 10s</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Flip Countdown Timer - Card style timer */}
        <FlipCountdownTimer
          seconds={countdownSeconds ?? 0}
          isVisible={currentPrize?.timerStatus === 'countdown' && countdownSeconds !== null}
          isUrgent={countdownSeconds !== null && currentPrize !== null && countdownSeconds <= getUrgentThresholdForPrize(currentPrize.value)}
          isBettingLocked={countdownSeconds !== null && countdownSeconds <= BETTING_LOCK_SECONDS}
        />

        {/* Main Prize Slider */}
        <View style={styles.sliderContainer}>
          {activePrizes.length > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={SLIDE_WIDTH}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                contentContainerStyle={styles.sliderContent}>
                {activePrizes.map((prize) => (
                  <TouchableOpacity
                    key={prize.id}
                    style={styles.prizeSlideWrapper}
                    onPress={handlePrizePress}
                    activeOpacity={0.95}>
                    <View style={[styles.prizeSlide, {backgroundColor: colors.card}]}>
                      <View style={styles.prizeImageContainer}>
                        <Image
                          source={{uri: prize.imageUrl}}
                          style={styles.prizeImage}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.prizeNameContainer}>
                        <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={2}>
                          {prize.name}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Pagination Dots */}
              {activePrizes.length > 1 && (
                <View style={styles.paginationContainer}>
                  {activePrizes.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentSlideIndex && styles.paginationDotActive,
                      ]}
                      onPress={() => {
                        scrollViewRef.current?.scrollTo({x: index * SLIDE_WIDTH, animated: true});
                      }}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                Nessun raffle attivo
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtonContainer}>
          {/* Ticket Counter */}
          <View style={styles.ticketCounterRow}>
            <View style={styles.creditsDisplay}>
              <Ionicons name="wallet" size={16} color={COLORS.primary} />
              <Text style={[styles.creditsText, {color: colors.text}]}>
                {user?.credits ?? 0} crediti
              </Text>
            </View>
            <Text style={styles.ticketCounterText}>
              Biglietti oggi: <Text style={styles.ticketCounterValue}>{ticketsPurchasedToday}/{DAILY_LIMITS.MAX_TICKETS_PER_DAY}</Text>
            </Text>
          </View>

          {/* Watch Ad Button */}
          <TouchableOpacity
            style={[styles.watchAdButton, (!canBuyTicket || !currentPrize || isBettingLocked) && styles.buttonDisabled]}
            onPress={handleWatchAd}
            disabled={isWatchingAd || !canBuyTicket || !currentPrize || isBettingLocked}
            activeOpacity={0.8}>
            <LinearGradient
              colors={canBuyTicket && currentPrize && !isBettingLocked ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.watchAdGradient}>
              <Ionicons name="play-circle" size={24} color={COLORS.white} />
              <Text style={styles.watchAdText}>
                {isBettingLocked ? 'PUNTATE CHIUSE' : isWatchingAd ? 'CARICAMENTO...' : cooldownMinutes > 0 ? `ATTENDI ${cooldownMinutes} MIN` : 'GUARDA UNA PUBBLICITÀ E RICEVI UN BIGLIETTO!'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Buy Credits Button */}
          <TouchableOpacity
            style={[styles.buyCreditsButton, {backgroundColor: colors.card, borderColor: COLORS.primary}]}
            onPress={() => navigation.navigate('Shop')}
            activeOpacity={0.8}>
            <Ionicons name="cart" size={20} color={COLORS.primary} />
            <Text style={[styles.buyCreditsText, {color: COLORS.primary}]}>COMPRA CREDITI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket Selection Modal */}
      <Modal
        visible={showTicketModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTicketModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.ticketModalContainer, {backgroundColor: colors.card}]}>
            <View style={styles.ticketModalHeader}>
              <Text style={[styles.ticketModalTitle, {color: colors.text}]}>Quanti biglietti?</Text>
              <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.ticketModalSubtitle, {color: colors.textMuted}]}>
              Hai {user?.credits ?? 0} crediti disponibili
            </Text>

            <View style={styles.ticketOptionsContainer}>
              {getTicketOptions().map((qty) => (
                <TouchableOpacity
                  key={qty}
                  style={styles.ticketOptionButton}
                  onPress={() => handleBuyTicketsWithCredits(qty)}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={[COLORS.primary, '#FF8500']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.ticketOptionGradient}>
                    <Ionicons name="ticket" size={24} color={COLORS.white} />
                    <Text style={styles.ticketOptionQty}>x{qty}</Text>
                    <Text style={styles.ticketOptionCredits}>{qty} credit{qty > 1 ? 'i' : 'o'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {remainingTicketsToday <= 10 && (
              <Text style={[styles.ticketModalWarning, {color: COLORS.primary}]}>
                Puoi ancora riscattare {remainingTicketsToday} bigliett{remainingTicketsToday === 1 ? 'o' : 'i'} oggi
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Streak Modal */}
      <StreakModal
        visible={showStreakModal}
        currentStreak={currentStreak}
        reward={streakReward}
        nextMilestone={getNextMilestone()}
        daysUntilWeeklyBonus={7 - (currentStreak % 7)}
        onClose={() => setShowStreakModal(false)}
      />

      {/* Extraction Result Modal */}
      <ExtractionResultModal
        visible={showResultModal}
        isWinner={extractionResult?.isWinner || false}
        prizeName={extractionResult?.prizeName}
        prizeImage={extractionResult?.prizeImage}
        winningNumber={extractionResult?.winningNumber}
        userNumbers={extractionResult?.userNumbers}
        onClose={hideResult}
      />

      {/* Ticket Success Modal */}
      <TicketSuccessModal
        visible={showTicketSuccessModal}
        ticketInfo={ticketSuccessInfo}
        onClose={() => {
          setShowTicketSuccessModal(false);
          setTicketSuccessInfo(null);
        }}
      />

      {/* Urgency Border Effect - Red pulsing border during countdown */}
      <UrgencyBorderEffect
        isActive={currentPrize?.timerStatus === 'countdown' && countdownSeconds !== null && countdownSeconds <= 10}
        intensity={countdownSeconds !== null && countdownSeconds <= 5 ? 'high' : 'medium'}
      />

      {/* Full-screen Extraction Effect */}
      <ExtractionStartEffect
        visible={showExtractionEffect}
        onAnimationComplete={onExtractionAnimationComplete}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  // Banner
  bannerContainer: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  bannerBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    gap: SPACING.md,
    alignItems: 'center',
  },
  progressSection: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressSubtext: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  buyTicketButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buyTicketGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  buyTicketText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Debug Buttons
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  debugButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  debugButtonText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Countdown Timer
  countdownContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  countdownGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  countdownTextContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
  countdownTime: {
    fontSize: 42,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 2,
  },
  // Slider
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sliderContent: {
    // No padding - full width slides
  },
  prizeSlideWrapper: {
    width: SLIDE_WIDTH,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  prizeSlide: {
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: `${COLORS.primary}50`,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  prizeImageContainer: {
    height: height * 0.30,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: RADIUS.xl - 2,
    borderTopRightRadius: RADIUS.xl - 2,
  },
  prizeImage: {
    width: '80%',
    height: '80%',
  },
  prizeNameContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  paginationDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    width: 28,
    borderRadius: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.md,
  },
  // Bottom Buttons
  bottomButtonContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: 90,
    gap: SPACING.sm,
  },
  ticketCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  creditsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creditsText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  ticketCounterText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#000',
  },
  ticketCounterValue: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  watchAdButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  watchAdGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  watchAdText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  buyCreditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  buyCreditsText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Ticket Selection Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  ticketModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
  },
  ticketModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  ticketModalSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.lg,
  },
  ticketOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  ticketOptionButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ticketOptionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minWidth: 90,
    gap: 4,
  },
  ticketOptionQty: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  ticketOptionCredits: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  ticketModalWarning: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

export default HomeScreen;
