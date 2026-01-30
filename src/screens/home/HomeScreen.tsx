import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground, StreakModal, AdOrCreditsModal} from '../../components/common';
import {useTicketsStore, usePrizesStore, useLevelStore, useStreakStore, useCreditsStore, useAuthStore, useSettingsStore, DAILY_LIMITS} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width} = Dimensions.get('window');
const SLIDE_WIDTH = width * 0.7;
const SLIDE_SPACING = SPACING.md;

interface HomeScreenProps {
  navigation: any;
}

// Tab Selector Component
interface TabSelectorProps {
  activeTab: 'in_corso' | 'futuri';
  onTabChange: (tab: 'in_corso' | 'futuri') => void;
}

const TabSelector: React.FC<TabSelectorProps> = ({activeTab, onTabChange}) => {
  const {colors} = useThemeColors();

  return (
    <View style={styles.tabSelectorContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'in_corso' && styles.tabButtonActive,
        ]}
        onPress={() => onTabChange('in_corso')}
        activeOpacity={0.8}>
        <Text style={[
          styles.tabButtonText,
          {color: activeTab === 'in_corso' ? COLORS.white : colors.textMuted},
        ]}>
          RAFFLE IN CORSO
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'futuri' && styles.tabButtonActive,
        ]}
        onPress={() => onTabChange('futuri')}
        activeOpacity={0.8}>
        <Text style={[
          styles.tabButtonText,
          {color: activeTab === 'futuri' ? COLORS.white : colors.textMuted},
        ]}>
          RAFFLE FUTURI
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Prize Slide Component (horizontal carousel)
interface PrizeSlideProps {
  prize: {
    id: string;
    name: string;
    imageUrl: string;
    currentAds: number;
    goalAds: number;
    timerStatus: string;
  };
  onPress: () => void;
}

const PrizeSlide: React.FC<PrizeSlideProps> = ({prize, onPress}) => {
  const {colors} = useThemeColors();
  const progress = Math.min(prize.currentAds / prize.goalAds, 1);
  const percentage = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.prizeSlide, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.9}>
      <View style={styles.prizeSlideImageContainer}>
        <Image source={{uri: prize.imageUrl}} style={styles.prizeSlideImage} resizeMode="contain" />
      </View>
      <View style={styles.prizeSlideInfo}>
        <Text style={[styles.prizeSlideName, {color: colors.text}]} numberOfLines={2}>
          {prize.name}
        </Text>
        <View style={styles.prizeSlideProgressContainer}>
          <View style={[styles.prizeSlideProgressBg, {backgroundColor: `${COLORS.primary}20`}]}>
            <View style={[styles.prizeSlideProgressFill, {width: `${percentage}%`}]} />
          </View>
          <Text style={styles.prizeSlideProgressText}>{percentage}%</Text>
        </View>
        <Text style={[styles.prizeSlideStatus, {color: colors.textMuted}]}>
          {prize.timerStatus === 'countdown'
            ? 'Estrazione in corso'
            : `${prize.goalAds - prize.currentAds} biglietti mancanti`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {fetchTickets, addTicket, incrementAdsWatched, canWatchAd, canPurchaseTicket, getTicketsPurchasedToday, getAdCooldownRemaining, checkAndResetDaily} = useTicketsStore();
  const {prizes, fetchPrizes, fetchDraws, incrementAdsForPrize} = usePrizesStore();
  const addXP = useLevelStore(state => state.addXP);
  const {currentStreak, checkAndUpdateStreak, getNextMilestone, hasClaimedToday, _hasHydrated} = useStreakStore();
  const {useCreditsForTicket: spendCreditsForTicket} = useCreditsStore();
  const user = useAuthStore(state => state.user);
  const refreshUserData = useAuthStore(state => state.refreshUserData);
  const {xpRewards, fetchSettings} = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'in_corso' | 'futuri'>('in_corso');
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakReward, setStreakReward] = useState<{xp: number; credits: number; isWeeklyBonus: boolean; isMilestone: boolean; milestoneDay?: number} | null>(null);
  const [showAdOrCreditsModal, setShowAdOrCreditsModal] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<any>(null);
  // Dati per UI - uso stato per evitare setState durante render
  const [ticketsPurchasedToday, setTicketsPurchasedToday] = useState(0);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [canBuyTicket, setCanBuyTicket] = useState(true);

  // Get prizes based on active tab
  const activePrizes = prizes.filter(p => p.isActive);
  const futurePrizes = prizes.filter(p => !p.isActive);
  const displayedPrizes = activeTab === 'in_corso' ? activePrizes : futurePrizes;

  useEffect(() => {
    checkAndResetDaily(); // Reset contatori se nuovo giorno
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

  // Aggiorna i dati UI dopo il mount (evita setState durante render)
  useEffect(() => {
    const updateTicketData = () => {
      setTicketsPurchasedToday(getTicketsPurchasedToday());
      setCooldownMinutes(getAdCooldownRemaining());
      setCanBuyTicket(canPurchaseTicket());
    };
    updateTicketData();
    // Aggiorna ogni minuto per il cooldown
    const interval = setInterval(updateTicketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getDrawIdForPrize = (prizeId: string, timerStartedAt?: string) => {
    const timestamp = timerStartedAt || new Date().toISOString();
    return `draw_${prizeId}_${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
  };

  const handlePrizePress = (prize: typeof activePrizes[0]) => {
    navigation.navigate('PrizeDetail', {prizeId: prize.id});
  };

  const handleGetTicket = (prize: typeof activePrizes[0]) => {
    setSelectedPrize(prize);
    setShowAdOrCreditsModal(true);
  };

  const handleWatchAd = async () => {
    const prize = selectedPrize;
    if (!prize) return;

    setShowAdOrCreditsModal(false);
    setIsWatchingAd(true);
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    incrementAdsForPrize(prize.id);
    incrementAdsWatched();
    addXP(xpRewards.WATCH_AD);

    const drawId = getDrawIdForPrize(prize.id, prize.timerStartedAt);
    await addTicket('ad', drawId, prize.id);
    refreshUserData();

    setIsWatchingAd(false);
    setSelectedPrize(null);
  };

  const handleUseCredits = async () => {
    const prize = selectedPrize;
    if (!prize) return;

    setShowAdOrCreditsModal(false);

    const success = await spendCreditsForTicket();
    if (!success) {
      setSelectedPrize(null);
      return;
    }

    incrementAdsForPrize(prize.id);
    addXP(xpRewards.CREDIT_TICKET);

    const drawId = getDrawIdForPrize(prize.id, prize.timerStartedAt);
    try {
      await addTicket('credits', drawId, prize.id);
    } catch {
      setSelectedPrize(null);
      return;
    }

    setSelectedPrize(null);
    refreshUserData().catch(() => {});
  };

  const handleWatchAdGeneric = () => {
    if (activePrizes.length > 0 && canPurchaseTicket()) {
      handleGetTicket(activePrizes[0]);
    }
  };

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

        {/* Tab Selector */}
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Horizontal Prize Slider */}
        <View style={styles.sliderSection}>
          {displayedPrizes.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderContent}
              decelerationRate="fast"
              snapToInterval={SLIDE_WIDTH + SLIDE_SPACING}
              snapToAlignment="start">
              {displayedPrizes.map((prize) => (
                <PrizeSlide
                  key={prize.id}
                  prize={prize}
                  onPress={() => handlePrizePress(prize)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                {activeTab === 'in_corso' ? 'Nessun raffle attivo' : 'Nessun raffle futuro'}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Watch Ad Button */}
        <View style={styles.bottomButtonContainer}>
          {/* Contatore biglietti */}
          <View style={styles.ticketCounterRow}>
            <Text style={[styles.ticketCounterText, {color: colors.textMuted}]}>
              Biglietti oggi: <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>{ticketsPurchasedToday}/{DAILY_LIMITS.MAX_TICKETS_PER_DAY}</Text>
            </Text>
            {cooldownMinutes > 0 && (
              <Text style={[styles.cooldownText, {color: colors.textMuted}]}>
                Prossima ads tra {cooldownMinutes} min
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.watchAdButton, {backgroundColor: colors.card}, !canBuyTicket && styles.watchAdButtonDisabled]}
            onPress={handleWatchAdGeneric}
            disabled={isWatchingAd || activePrizes.length === 0 || !canBuyTicket}
            activeOpacity={0.8}>
            <LinearGradient
              colors={canBuyTicket ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.watchAdGradient}>
              <Ionicons name="play-circle" size={24} color={COLORS.white} />
              <Text style={styles.watchAdText}>
                {isWatchingAd ? 'GUARDANDO...' : !canBuyTicket ? 'LIMITE GIORNALIERO RAGGIUNTO' : 'GUARDA PUBBLICITÀ E GUADAGNA UN CREDITO'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <AdOrCreditsModal
        visible={showAdOrCreditsModal}
        userCredits={user?.credits ?? 0}
        prizeName={selectedPrize?.name ?? ''}
        onWatchAd={handleWatchAd}
        onUseCredits={handleUseCredits}
        onGoToShop={() => {
          setShowAdOrCreditsModal(false);
          navigation.navigate('Shop');
        }}
        onClose={() => {
          setShowAdOrCreditsModal(false);
          setSelectedPrize(null);
        }}
      />

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
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  // Banner
  bannerContainer: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  bannerBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bannerBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Tab Selector
  tabSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Slider
  sliderSection: {
    marginBottom: SPACING.md,
  },
  sliderContent: {
    paddingHorizontal: SPACING.md,
    gap: SLIDE_SPACING,
  },
  prizeSlide: {
    width: SLIDE_WIDTH,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  prizeSlideImageContainer: {
    height: 140,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeSlideImage: {
    width: '80%',
    height: '90%',
  },
  prizeSlideInfo: {
    padding: SPACING.md,
  },
  prizeSlideName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  prizeSlideProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  prizeSlideProgressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prizeSlideProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  prizeSlideProgressText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    minWidth: 35,
    textAlign: 'right',
  },
  prizeSlideStatus: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.sm,
  },
  // Bottom Button Container
  bottomButtonContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: 100,
  },
  ticketCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  ticketCounterText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  cooldownText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  // Watch Ad Button
  watchAdButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  watchAdButtonDisabled: {
    opacity: 0.7,
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
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default HomeScreen;
