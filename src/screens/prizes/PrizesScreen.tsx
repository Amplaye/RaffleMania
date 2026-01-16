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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {usePrizesStore, useTicketsStore} from '../../store';
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
  ticketCode: string;
  prizeName: string;
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
          <Text style={styles.modalTitle}>Biglietto Ottenuto!</Text>
          <Text style={styles.modalSubtitle}>Hai un nuovo biglietto per partecipare</Text>

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

// Smooth Progress Bar Component
const SmoothProgressBar: React.FC<{
  currentAds: number;
  goalAds: number;
  prizeId: string;
}> = ({currentAds, goalAds, prizeId}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const prevPrizeId = useRef(prizeId);

  const percentage = Math.min((currentAds / goalAds) * 100, 100);

  useEffect(() => {
    if (prevPrizeId.current !== prizeId) {
      progressAnim.setValue(0);
      prevPrizeId.current = prizeId;
    }

    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage, prizeId]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, {width: animatedWidth}]}>
          <LinearGradient
            colors={[COLORS.primary, '#FF8500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {currentAds.toLocaleString()} / {goalAds.toLocaleString()}
        </Text>
        <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

// Prize Card Component
const PrizeCard: React.FC<{
  item: Prize;
  index: number;
  onWatchAd: (prize: Prize) => void;
}> = ({item, index, onWatchAd}) => {
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

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <View style={styles.card}>
        {/* Prize Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.imageUrl}}
            style={styles.prizeImage}
            resizeMode="contain"
          />
        </View>

        {/* Prize Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.prizeName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Progress Bar */}
          <SmoothProgressBar
            currentAds={item.currentAds}
            goalAds={item.goalAds}
            prizeId={item.id}
          />

          {/* Watch Ad Button */}
          <TouchableOpacity
            style={styles.watchButton}
            activeOpacity={0.8}
            onPress={handleWatchAd}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.watchButtonGradient}>
              <Ionicons name="play-circle" size={20} color={COLORS.white} />
              <Text style={styles.watchButtonText}>Guarda Ads</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export const PrizesScreen: React.FC<PrizesScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {prizes, fetchPrizes, incrementAdsForPrize} = usePrizesStore();
  const {addTicket, canWatchAd, incrementAdsWatched, todayAdsWatched, maxAdsPerDay} = useTicketsStore();
  const {currentDraw} = usePrizesStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketInfo, setNewTicketInfo] = useState<TicketModalInfo | null>(null);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrizes();
    setRefreshing(false);
  };

  const handleWatchAd = async (prize: Prize) => {
    if (!canWatchAd()) {
      Alert.alert(
        'Limite raggiunto',
        `Hai raggiunto il limite di ${maxAdsPerDay} ads per oggi. Torna domani!`,
      );
      return;
    }

    setIsWatchingAd(true);

    // Simulate watching ad
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Increment ads for this prize
    incrementAdsForPrize(prize.id);
    incrementAdsWatched();

    if (currentDraw) {
      const newTicket = addTicket('ad', currentDraw.id, prize.id);
      setNewTicketInfo({
        ticketCode: newTicket.uniqueCode,
        prizeName: prize.name,
      });
      setShowTicketModal(true);
    }

    setIsWatchingAd(false);
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    setNewTicketInfo(null);
  };

  const activePrizes = prizes.filter(p => p.isActive);

  const renderPrize = ({item, index}: {item: Prize; index: number}) => (
    <PrizeCard
      item={item}
      index={index}
      onWatchAd={handleWatchAd}
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
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  prizeImage: {
    width: '80%',
    height: '100%',
  },
  infoContainer: {
    padding: SPACING.md,
  },
  prizeName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  // Progress Bar Styles
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textMuted,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  // Watch Button Styles
  watchButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  watchButtonGradient: {
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
});

export default PrizesScreen;
