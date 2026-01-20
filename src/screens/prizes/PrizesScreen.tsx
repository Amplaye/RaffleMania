import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
  Easing,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground, AdOrCreditsModal} from '../../components/common';
import {usePrizesStore, useTicketsStore, useLevelStore, useCreditsStore, useAuthStore, XP_REWARDS} from '../../store';
import {getTotalPoolTickets} from '../../services/mock';
import {useThemeColors} from '../../hooks/useThemeColors';
import {Prize} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width} = Dimensions.get('window');

interface PrizesScreenProps {
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
              <Ionicons name="ticket" size={40} color={COLORS.white} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>Nuovo Numero Ottenuto!</Text>
          <Text style={styles.modalSubtitle}>Hai un nuovo numero per l'estrazione</Text>

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
                <View style={styles.modalTicketHeader}>
                  <Ionicons name="ticket" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.modalTicketLabel}>IL TUO NUMERO</Text>
                </View>
                <Text style={styles.modalTicketCode}>#{ticketInfo.ticketNumber}</Text>
                <View style={styles.modalTicketDivider} />
                <View style={styles.modalTicketPrizeRow}>
                  <Ionicons name="gift" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.modalTicketPrize}>{ticketInfo.prizeName}</Text>
                </View>
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

// Shimmer Progress Bar Component (like Home)
const ShimmerProgressBar: React.FC<{
  currentAds: number;
  goalAds: number;
  prizeId: string;
}> = ({currentAds, goalAds, prizeId}) => {
  const {colors, neon} = useThemeColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  const prevPrizeId = useRef(prizeId);

  const progress = Math.min(currentAds / goalAds, 1);
  const percentage = Math.round(progress * 100);

  useEffect(() => {
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
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <Ionicons name="trophy-outline" size={14} color={colors.primary} />
          <Text style={[styles.progressLabel, {color: colors.textMuted}]}>Progresso</Text>
        </View>
        <Text style={[styles.progressPercentage, neon.textShadow]}>{percentage}%</Text>
      </View>

      <View style={[styles.progressBar, {backgroundColor: `${colors.primary}15`}]}>
        <Animated.View style={[styles.progressFill, {width: animatedWidth, backgroundColor: COLORS.primary}]}>
          <Animated.View
            style={[
              styles.progressShimmer,
              {transform: [{translateX: shimmerTranslate}]},
            ]}
          />
        </Animated.View>
      </View>

      <View style={styles.progressFooter}>
        <Text style={[styles.progressCount, {color: colors.textMuted}]}>
          <Text style={{color: colors.primary, fontWeight: '700'}}>{currentAds.toLocaleString()}</Text>
          {' / '}
          {goalAds.toLocaleString()} Biglietti
        </Text>
      </View>
    </View>
  );
};

// Prize Card Component
const PrizeCard: React.FC<{
  item: Prize;
  index: number;
  onWatchAd: (prize: Prize) => void;
  onPress: (prize: Prize) => void;
}> = ({item, index, onWatchAd, onPress}) => {
  const {colors, neon} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleWatchAd = () => {
    onWatchAd(item);
  };

  // Image background colors - cream gradient
  const imageBackgroundColors = ['#FFF8F0', '#FFF5E6', '#FFECD2'];

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity
        style={[styles.card, {backgroundColor: colors.card}]}
        activeOpacity={0.9}
        onPress={() => onPress(item)}>
        {/* Prize Image */}
        <View style={styles.imageContainer}>
          <LinearGradient
            colors={imageBackgroundColors}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={StyleSheet.absoluteFill}>
            <View style={styles.imageWrapper}>
              <Image
                source={{uri: item.imageUrl}}
                style={styles.prizeImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
          {/* Info Badge */}
          <View style={styles.infoBadge}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.infoBadgeGradient}>
              <Ionicons name="information" size={18} color={COLORS.white} />
            </LinearGradient>
          </View>
          {/* Bottom separator */}
          <View style={styles.imageSeparator} />
        </View>

        {/* Prize Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.prizeDescription, {color: colors.textMuted}]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Progress Bar */}
          <ShimmerProgressBar
            currentAds={item.currentAds}
            goalAds={item.goalAds}
            prizeId={item.id}
          />

          {/* Watch Ad Button */}
          <TouchableOpacity
            style={[styles.watchButton, neon.glowStrong]}
            activeOpacity={0.8}
            onPress={handleWatchAd}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.watchButtonGradient}>
              <View style={styles.watchButtonContent}>
                <Ionicons name="play-circle" size={20} color={COLORS.white} />
                <Text style={[styles.watchButtonText, neon.textShadow]}>Guarda Ads</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PrizesScreen: React.FC<PrizesScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {prizes, fetchPrizes, incrementAdsForPrize} = usePrizesStore();
  const {addTicket, incrementAdsWatched, getTicketsForPrize, getTicketNumbersForPrize} = useTicketsStore();
  const {currentDraw} = usePrizesStore();
  const addXP = useLevelStore(state => state.addXP);
  const {useCreditsForTicket} = useCreditsStore();
  const user = useAuthStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketInfo, setNewTicketInfo] = useState<TicketModalInfo | null>(null);
  const [showAdOrCreditsModal, setShowAdOrCreditsModal] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrizes();
    setRefreshing(false);
  };

  // Show the ad or credits choice modal
  const handleShowAdOrCreditsModal = (prize: Prize) => {
    setSelectedPrize(prize);
    setShowAdOrCreditsModal(true);
  };

  const handleWatchAd = async () => {
    if (!selectedPrize) return;

    setShowAdOrCreditsModal(false);
    setIsWatchingAd(true);

    // Simulate watching ad
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Increment ads for this prize
    incrementAdsForPrize(selectedPrize.id);
    incrementAdsWatched();

    // Add XP for watching ad
    addXP(XP_REWARDS.WATCH_AD);

    if (currentDraw) {
      // Add new ticket and get the assigned number
      const newTicket = addTicket('ad', currentDraw.id, selectedPrize.id);

      // Get all user's numbers for this prize (including the new one)
      const userNumbers = getTicketNumbersForPrize(selectedPrize.id);
      const totalPool = getTotalPoolTickets(selectedPrize.id);

      setNewTicketInfo({
        ticketNumber: newTicket.ticketNumber,
        prizeName: selectedPrize.name,
        userNumbers,
        totalPoolTickets: totalPool,
      });
      setShowTicketModal(true);
    }

    setIsWatchingAd(false);
  };

  const handleUseCredits = async () => {
    if (!selectedPrize || !currentDraw) return;

    setShowAdOrCreditsModal(false);

    const success = await useCreditsForTicket();
    if (!success) {
      Alert.alert('Errore', 'Crediti insufficienti');
      return;
    }

    // Increment ads for this prize (counts as participation)
    incrementAdsForPrize(selectedPrize.id);

    // Add new ticket and get the assigned number
    const newTicket = addTicket('credits', currentDraw.id, selectedPrize.id);

    // Get all user's numbers for this prize (including the new one)
    const userNumbers = getTicketNumbersForPrize(selectedPrize.id);
    const totalPool = getTotalPoolTickets(selectedPrize.id);

    setNewTicketInfo({
      ticketNumber: newTicket.ticketNumber,
      prizeName: selectedPrize.name,
      userNumbers,
      totalPoolTickets: totalPool,
    });
    setShowTicketModal(true);
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    setNewTicketInfo(null);
  };

  const handlePrizePress = (prize: Prize) => {
    navigation.navigate('PrizeDetail', {prizeId: prize.id});
  };

  const activePrizes = prizes.filter(p => p.isActive);

  const renderPrize = ({item, index}: {item: Prize; index: number}) => (
    <PrizeCard
      item={item}
      index={index}
      onWatchAd={handleShowAdOrCreditsModal}
      onPress={handlePrizePress}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, {color: colors.text}]}>Premi</Text>
      <Text style={[styles.subtitle, {color: colors.textMuted}]}>
        Guarda le ads per partecipare alle estrazioni
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={64} color={colors.border} />
      <Text style={[styles.emptyTitle, {color: colors.text}]}>Nessun premio disponibile</Text>
      <Text style={[styles.emptySubtitle, {color: colors.textMuted}]}>
        Torna presto per nuovi fantastici premi!
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <AnimatedBackground />
      <FlatList
        data={activePrizes}
        renderItem={renderPrize}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
      />

      {/* Ad or Credits Choice Modal */}
      <AdOrCreditsModal
        visible={showAdOrCreditsModal}
        userCredits={user?.credits ?? 0}
        prizeName={selectedPrize?.name ?? ''}
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: SPACING.xl + 30,
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Card Styles
  cardContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  imageContainer: {
    height: 220,
    position: 'relative',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  prizeImage: {
    width: '85%',
    height: '100%',
  },
  imageSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  infoBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  infoBadgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  infoContainer: {
    padding: SPACING.lg,
  },
  prizeName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  prizeDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  // Progress Bar Styles
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 4,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{skewX: '-25deg'}],
  },
  progressFooter: {
    alignItems: 'center',
  },
  progressCount: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  // Watch Button Styles
  watchButton: {
    borderRadius: RADIUS.lg,
  },
  watchButtonGradient: {
    borderRadius: RADIUS.lg,
  },
  watchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  watchButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
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
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.4,
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
    borderRadius: RADIUS.lg,
  },
  modalTicketGradient: {
    borderRadius: RADIUS.lg,
  },
  modalTicketContent: {
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
  // Boost Modal Styles
  modalBoostCard: {
    width: '100%',
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#00B894',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
});

export default PrizesScreen;
