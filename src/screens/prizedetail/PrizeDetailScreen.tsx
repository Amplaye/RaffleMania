import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground, AdOrCreditsModal} from '../../components/common';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
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

type Props = NativeStackScreenProps<RootStackParamList, 'PrizeDetail'>;

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
}> = ({currentAds, goalAds}) => {
  const {colors, neon} = useThemeColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  const progress = Math.min(currentAds / goalAds, 1);
  const percentage = Math.round(progress * 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

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
    <View style={[styles.progressSection, {backgroundColor: colors.card}, neon.glowSubtle]}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <Ionicons name="trophy-outline" size={16} color={colors.primary} />
          <Text style={[styles.progressTitle, {color: colors.textMuted}]}>Progresso Premio</Text>
        </View>
        <Text style={[styles.progressPercentage, neon.textShadow]}>{percentage}%</Text>
      </View>

      <View style={[styles.progressBar, {backgroundColor: `${colors.primary}15`}]}>
        <Animated.View style={[styles.progressFill, {width: animatedWidth}]}>
          <LinearGradient
            colors={['#FF8C00', '#FF6B00', '#FF5500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.progressGradient}
          />
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

export const PrizeDetailScreen: React.FC<Props> = ({route, navigation}) => {
  const {prizeId} = route.params;
  const {colors, gradientColors, isDark, neon} = useThemeColors();
  const {prizes, incrementAdsForPrize, currentDraw} = usePrizesStore();
  const {addTicket, incrementAdsWatched, getTicketsForPrize, getTicketNumbersForPrize} = useTicketsStore();
  const addXP = useLevelStore(state => state.addXP);
  const {useCreditsForTicket} = useCreditsStore();
  const {user} = useAuthStore();

  // Get ticket stats for this prize
  const myTickets = getTicketsForPrize(prizeId);
  const myTicketCount = myTickets.length;
  const myNumbers = getTicketNumbersForPrize(prizeId);
  const totalPoolTickets = getTotalPoolTickets(prizeId);
  const hasTickets = myTicketCount > 0;

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicketInfo, setNewTicketInfo] = useState<TicketModalInfo | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showAdOrCreditsModal, setShowAdOrCreditsModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageScaleAnim = useRef(new Animated.Value(0.8)).current;

  const prize = prizes.find(p => p.id === prizeId);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(imageScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleWatchAd = async () => {
    if (!prize) return;

    setIsWatchingAd(true);

    // Simulate watching ad
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Increment ads for this prize
    incrementAdsForPrize(prize.id);
    incrementAdsWatched();

    // Add XP for watching ad
    addXP(XP_REWARDS.WATCH_AD);

    if (currentDraw) {
      // Add new ticket and get the assigned number
      const newTicket = addTicket('ad', currentDraw.id, prize.id);

      // Get all user's numbers for this prize (including the new one)
      const userNumbers = getTicketNumbersForPrize(prize.id);
      const totalPool = getTotalPoolTickets(prize.id);

      setNewTicketInfo({
        ticketNumber: newTicket.ticketNumber,
        prizeName: prize.name,
        userNumbers,
        totalPoolTickets: totalPool,
      });
      setShowTicketModal(true);
    }

    setIsWatchingAd(false);
  };

  const handleShowAdOrCreditsModal = () => {
    if (!prize) return;
    setShowAdOrCreditsModal(true);
  };

  const handleUseCredits = async () => {
    if (!prize || !currentDraw) return;
    setShowAdOrCreditsModal(false);

    const success = await useCreditsForTicket();
    if (!success) {
      return;
    }

    // Add new ticket and get the assigned number
    const newTicket = addTicket('credits', currentDraw.id, prize.id);

    // Get all user's numbers for this prize (including the new one)
    const userNumbers = getTicketNumbersForPrize(prize.id);
    const totalPool = getTotalPoolTickets(prize.id);

    setNewTicketInfo({
      ticketNumber: newTicket.ticketNumber,
      prizeName: prize.name,
      userNumbers,
      totalPoolTickets: totalPool,
    });
    setShowTicketModal(true);
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    setNewTicketInfo(null);
  };

  if (!prize) {
    return (
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, {color: colors.text}]}>Premio non trovato</Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Torna indietro</Text>
          </TouchableOpacity>
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Dettaglio Premio</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Prize Image */}
        <Animated.View
          style={[
            styles.imageCard,
            neon.glowSubtle,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{scale: imageScaleAnim}],
            },
          ]}>
          <View style={styles.imageContainer}>
            <Image
              source={{uri: prize.imageUrl}}
              style={styles.prizeImage}
              resizeMode="contain"
            />
          </View>

          {/* Value Badge */}
          <View style={styles.valueBadge}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.valueBadgeGradient}>
              <View style={styles.valueBadgeContent}>
                <Text style={styles.valueBadgeText}>€{prize.value}</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Prize Info */}
        <Animated.View
          style={[
            styles.infoCard,
            neon.glowSubtle,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Text style={[styles.prizeName, {color: colors.text}]}>{prize.name}</Text>
          <Text style={[styles.prizeDescription, {color: colors.textSecondary}]}>
            {prize.description}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, {backgroundColor: 'rgba(255, 107, 0, 0.1)'}]}>
                <Ionicons name="ticket-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.statValue, {color: colors.text}]}>{myTicketCount}</Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>I Miei Biglietti</Text>
            </View>

            <View style={[styles.statDivider, {backgroundColor: colors.border}]} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, {backgroundColor: 'rgba(0, 184, 148, 0.1)'}]}>
                <Ionicons name="trending-up-outline" size={20} color={COLORS.success} />
              </View>
              <Text style={[styles.statValue, {color: colors.text}]}>{myTicketCount > 0 ? ((myTicketCount / totalPoolTickets) * 100).toFixed(2) : '0'}%</Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>Probabilità</Text>
            </View>

            <View style={[styles.statDivider, {backgroundColor: colors.border}]} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, {backgroundColor: 'rgba(253, 203, 110, 0.1)'}]}>
                <Ionicons name="trophy-outline" size={20} color={COLORS.warning} />
              </View>
              <Text style={[styles.statValue, {color: colors.text}]}>€{prize.value}</Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>Valore</Text>
            </View>
          </View>
        </Animated.View>

        {/* My Ticket Card - shows user's numbers */}
        {hasTickets && (
          <Animated.View
            style={[
              styles.myTicketCard,
              neon.glowSubtle,
              {
                backgroundColor: colors.card,
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <View style={styles.myTicketHeader}>
              <View style={styles.myTicketIconContainer}>
                <Ionicons name="ticket" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.myTicketTitle, {color: colors.text}]}>I Tuoi Numeri</Text>
              {/* Ticket count badge */}
              <View style={styles.duplicateCounterContainer}>
                <LinearGradient
                  colors={['#00B894', '#00A085']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.duplicateCounterGradient}>
                  <View style={styles.duplicateCounterContent}>
                    <Text style={styles.duplicateCounterText}>{myTicketCount}</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
            <View style={styles.myTicketCodeContainer}>
              <Text style={[styles.myTicketCode, {color: colors.text}]}>
                {myNumbers.map(n => `#${n}`).join(', ')}
              </Text>
              <View style={styles.myTicketBadge}>
                <Text style={styles.myTicketBadgeText}>Estrazione</Text>
              </View>
            </View>
            <Text style={[styles.myTicketHint, {color: colors.textMuted}]}>
              Questi numeri parteciperanno all'estrazione
            </Text>
          </Animated.View>
        )}

        {/* Probability Info Card */}
        {myTicketCount > 0 && (
          <Animated.View
            style={[
              styles.probabilityCard,
              neon.glowSubtle,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <LinearGradient
              colors={['#00B894', '#00A085']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.probabilityGradient}>
              <View style={styles.probabilityContentWrapper}>
                <View style={styles.probabilityContent}>
                  <View style={styles.probabilityLeft}>
                    <Ionicons name="trending-up" size={24} color={COLORS.white} />
                    <View style={styles.probabilityTextContainer}>
                      <Text style={styles.probabilityTitle}>Le tue probabilità</Text>
                      <Text style={styles.probabilitySubtitle}>
                        {myTicketCount} {myTicketCount === 1 ? 'numero' : 'numeri'} su {totalPoolTickets} totali
                      </Text>
                    </View>
                  </View>
                  <View style={styles.probabilityBadge}>
                    <Text style={styles.probabilityValue}>{((myTicketCount / totalPoolTickets) * 100).toFixed(2)}%</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Progress Section */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <ShimmerProgressBar currentAds={prize.currentAds} goalAds={prize.goalAds} />
        </Animated.View>

        {/* How it Works */}
        <Animated.View
          style={[
            styles.howItWorksCard,
            neon.glowSubtle,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Come Funziona</Text>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, {backgroundColor: COLORS.primary}]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, {color: colors.text}]}>Guarda un'Ad</Text>
                <Text style={[styles.stepDescription, {color: colors.textMuted}]}>
                  Premi il pulsante per guardare una pubblicita
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, {backgroundColor: COLORS.primary}]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, {color: colors.text}]}>Ottieni un Biglietto</Text>
                <Text style={[styles.stepDescription, {color: colors.textMuted}]}>
                  Ricevi un biglietto unico per questo premio
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, {backgroundColor: COLORS.primary}]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, {color: colors.text}]}>Aumenta le Probabilita</Text>
                <Text style={[styles.stepDescription, {color: colors.textMuted}]}>
                  Ogni biglietto ti da +0.5% di probabilita di vincita!
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, {backgroundColor: COLORS.primary}]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, {color: colors.text}]}>Vinci il Premio</Text>
                <Text style={[styles.stepDescription, {color: colors.textMuted}]}>
                  Piu biglietti hai, piu chance di vincere!
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Spacer for button */}
        <View style={{height: 100}} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomButtonContainer, {backgroundColor: colors.background}]}>
        <TouchableOpacity
          style={[styles.watchButton, neon.glowStrong]}
          activeOpacity={0.8}
          onPress={handleShowAdOrCreditsModal}
          disabled={isWatchingAd}>
          <LinearGradient
            colors={isWatchingAd ? ['#999', '#777'] : [COLORS.primary, '#FF8500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.watchButtonGradient}>
            <View style={styles.watchButtonContent}>
              {isWatchingAd ? (
                <>
                  <Ionicons name="hourglass" size={24} color={COLORS.white} />
                  <Text style={styles.watchButtonText}>Caricamento...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play-circle" size={24} color={COLORS.white} />
                  <Text style={styles.watchButtonText}>Guarda Ads</Text>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Ticket Success Modal */}
      <TicketSuccessModal
        visible={showTicketModal}
        ticketInfo={newTicketInfo}
        onClose={handleCloseModal}
      />

      {/* Ad or Credits Choice Modal */}
      <AdOrCreditsModal
        visible={showAdOrCreditsModal}
        userCredits={user?.credits ?? 0}
        prizeName={prize?.name ?? ''}
        onWatchAd={() => {
          setShowAdOrCreditsModal(false);
          handleWatchAd();
        }}
        onUseCredits={handleUseCredits}
        onGoToShop={() => {
          setShowAdOrCreditsModal(false);
          navigation.navigate('Credits');
        }}
        onClose={() => setShowAdOrCreditsModal(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xl + 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  // Image Card
  imageCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    position: 'relative',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  imageContainer: {
    height: 250,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  prizeImage: {
    width: '100%',
    height: '100%',
  },
  valueBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  valueBadgeGradient: {
    borderRadius: RADIUS.lg,
  },
  valueBadgeContent: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  valueBadgeText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Info Card
  infoCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  prizeName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
  },
  prizeDescription: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  statDivider: {
    width: 1,
    height: 50,
  },
  // My Ticket Card Styles
  myTicketCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  myTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  duplicateCounterContainer: {
    marginLeft: 'auto',
  },
  duplicateCounterGradient: {
    borderRadius: RADIUS.md,
  },
  duplicateCounterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  duplicateCounterText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  myTicketIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myTicketTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  myTicketCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  myTicketCode: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2,
  },
  myTicketBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  myTicketBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  myTicketHint: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  // Probability Card Styles
  probabilityCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  probabilityGradient: {
    borderRadius: RADIUS.xl,
  },
  probabilityContentWrapper: {
    padding: SPACING.md,
  },
  probabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  probabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  probabilityTextContainer: {
    flex: 1,
  },
  probabilityTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  probabilitySubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  probabilityBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  probabilityValue: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Progress Section Styles
  progressSection: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 6,
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
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  goalText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  // How it Works
  howItWorksCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
  // Bottom Button
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  watchButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  watchButtonGradient: {
    borderRadius: RADIUS.lg,
  },
  watchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: SPACING.sm,
  },
  watchButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButtonError: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
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

export default PrizeDetailScreen;
