import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {useTicketsStore, usePrizesStore, useAuthStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {AnimatedBackground} from '../../components/common';
import apiClient from '../../services/apiClient';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
  API_CONFIG,
} from '../../utils/constants';
import {formatDate} from '../../utils/formatters';

interface TicketDetailScreenProps {
  route: {params: {ticketId: string}};
  navigation: any;
}

export const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({route, navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {ticketId} = route.params;
  const {activeTickets, pastTickets} = useTicketsStore();
  const {prizes} = usePrizesStore();
  const user = useAuthStore(state => state.user);

  const {myWins} = usePrizesStore();
  const [deliveryStatus, setDeliveryStatus] = useState<'processing' | 'delivered'>('processing');
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  const ticket = [...activeTickets, ...pastTickets].find(t => t.id === ticketId);
  const prize = ticket?.prizeId ? prizes.find(p => p.id === ticket.prizeId) : null;

  const displayPrizeName = ticket?.prizeName || prize?.name || 'Premio';
  const displayPrizeImage = ticket?.prizeImage || prize?.imageUrl;
  const displayPrizeDescription = prize?.description || '';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch delivery status for winning tickets
  useEffect(() => {
    if (!ticket?.isWinner) return;

    // Check if ticket already has deliveryStatus from local state
    if (ticket.deliveryStatus) {
      setDeliveryStatus(ticket.deliveryStatus);
      if (ticket.deliveredAt) setDeliveredAt(ticket.deliveredAt);
      return;
    }

    // Check myWins for delivery status (most reliable - already fetched)
    const winRecord = myWins.find(w => w.ticketId === ticket.id);
    if (winRecord?.deliveryStatus) {
      setDeliveryStatus(winRecord.deliveryStatus as 'processing' | 'delivered');
      if (winRecord.deliveredAt) setDeliveredAt(winRecord.deliveredAt);
      return;
    }

    // Fallback: fetch from dedicated API endpoint
    const fetchDeliveryStatus = async () => {
      try {
        if (API_CONFIG.USE_MOCK_DATA) return;
        const response = await apiClient.get(`/winners/delivery-status/${ticket.id}`);
        if (response.data?.success && response.data?.data) {
          setDeliveryStatus(response.data.data.deliveryStatus || 'processing');
          setDeliveredAt(response.data.data.deliveredAt || null);
        }
      } catch {
        // Non-critical - keep default 'processing'
      }
    };

    fetchDeliveryStatus();
  }, [ticket?.isWinner, ticket?.id, ticket?.deliveryStatus, ticket?.deliveredAt, myWins]);

  // Winner glow animation
  useEffect(() => {
    if (ticket?.isWinner) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [ticket?.isWinner, glowAnim]);

  if (!ticket) {
    return (
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <AnimatedBackground />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, {color: colors.text}]}>Biglietto non trovato</Text>
        </View>
      </LinearGradient>
    );
  }

  const isWinner = ticket.isWinner;

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
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          {isWinner ? 'Hai Vinto!' : 'Dettaglio Biglietto'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {isWinner ? (
          <>
            {/* === WINNER VIEW === */}

            {/* Compact Winner Banner with trophy top-left and winning number */}
            <Animated.View
              style={[
                styles.winnerBanner,
                {
                  opacity: fadeAnim,
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00', '#FF6B00']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.winnerBannerGradient}>
                {/* Decorative circle */}
                <View style={styles.bannerDecorRight} />

                {/* Top row: trophy + congrats text */}
                <View style={styles.bannerTopRow}>
                  <View style={styles.trophySmall}>
                    <Ionicons name="trophy" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.winnerBannerTitle}>Congratulazioni!</Text>
                    <Text style={styles.winnerBannerName}>{user?.displayName || 'Vincitore'}</Text>
                  </View>
                </View>

                {/* Winning number inside banner */}
                <View style={styles.bannerNumberSection}>
                  <Text style={styles.bannerNumberLabel}>NUMERO VINCENTE</Text>
                  <Text style={styles.bannerNumberValue}>#{ticket.ticketNumber}</Text>
                </View>

                {/* Date row */}
                <View style={styles.bannerFooter}>
                  <View style={styles.bannerFooterItem}>
                    <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.bannerFooterText}>
                      {formatDate(ticket.wonAt || ticket.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.bannerFooterItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                    <Text style={styles.bannerFooterText}>Confermato</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Prize Showcase Card */}
            <Animated.View
              style={[
                styles.prizeShowcaseCard,
                {
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{scale: scaleAnim}],
                },
              ]}>
              {/* Prize Image */}
              <View style={styles.showcaseImageContainer}>
                {displayPrizeImage && (
                  <Image
                    source={{uri: displayPrizeImage}}
                    style={styles.showcasePrizeImage}
                    resizeMode="contain"
                  />
                )}
                <Animated.View style={[styles.imageGlow, {opacity: glowAnim}]} />
              </View>

              {/* Prize Name & Description */}
              <View style={styles.showcaseInfo}>
                <Text style={[styles.showcasePrizeName, {color: colors.text}]}>{displayPrizeName}</Text>
                {displayPrizeDescription ? (
                  <Text style={[styles.showcaseDescription, {color: colors.textMuted}]}>
                    {displayPrizeDescription}
                  </Text>
                ) : null}
              </View>
            </Animated.View>

            {/* Prize Delivery Info */}
            <Animated.View
              style={[
                styles.deliveryCard,
                {
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              <View style={styles.deliveryHeader}>
                <View style={styles.deliveryIconContainer}>
                  <Ionicons name="mail" size={20} color={COLORS.primary} />
                </View>
                <Text style={[styles.deliveryTitle, {color: colors.text}]}>Consegna Premio</Text>
              </View>

              {/* Delivery Timeline */}
              <View style={styles.timeline}>
                {/* Step 1: In Lavorazione */}
                <View style={styles.timelineStep}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={[styles.timelineStepTitle, {color: colors.text}]}>In Lavorazione</Text>
                    <Text style={[styles.timelineStepDesc, {color: colors.textMuted}]}>
                      Premio in fase di preparazione
                    </Text>
                  </View>
                </View>

                {/* Timeline connector */}
                <View style={styles.timelineConnectorContainer}>
                  <View style={[
                    styles.timelineConnector,
                    deliveryStatus === 'delivered'
                      ? styles.timelineConnectorActive
                      : styles.timelineConnectorInactive,
                  ]} />
                </View>

                {/* Step 2: Consegnato */}
                <View style={styles.timelineStep}>
                  <View style={[
                    styles.timelineDot,
                    deliveryStatus === 'delivered'
                      ? styles.timelineDotActive
                      : styles.timelineDotInactive,
                  ]}>
                    {deliveryStatus === 'delivered' ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={styles.timelineStepContent}>
                    <Text style={[
                      styles.timelineStepTitle,
                      {color: deliveryStatus === 'delivered' ? colors.text : colors.textMuted},
                    ]}>
                      Consegnato
                    </Text>
                    <Text style={[styles.timelineStepDesc, {color: colors.textMuted}]}>
                      {deliveryStatus === 'delivered' && deliveredAt
                        ? `Consegnato il ${formatDate(deliveredAt)}`
                        : 'In attesa di consegna via email'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.deliveryEmailRow, {backgroundColor: `${COLORS.primary}08`}]}>
                <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.deliveryEmail, {color: colors.text}]}>
                  {user?.email || 'Email del tuo account'}
                </Text>
              </View>
            </Animated.View>

            {/* Support Note */}
            <Animated.View
              style={[
                styles.supportNote,
                {
                  backgroundColor: `${COLORS.primary}08`,
                  borderColor: COLORS.primary,
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              <Ionicons name="headset" size={18} color={COLORS.primary} />
              <Text style={[styles.supportNoteText, {color: colors.textSecondary}]}>
                Hai domande sulla tua vincita? Contattaci tramite la chat di supporto.
              </Text>
            </Animated.View>
          </>
        ) : (
          <>
            {/* === NON-WINNER VIEW === */}

            {/* Prize Image Card */}
            <Animated.View
              style={[
                styles.imageCard,
                {
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{scale: scaleAnim}],
                  borderColor: `${COLORS.primary}50`,
                },
              ]}>
              <View style={styles.imageContainer}>
                {displayPrizeImage && (
                  <Image
                    source={{uri: displayPrizeImage}}
                    style={styles.prizeImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </Animated.View>

            {/* Prize Info Card */}
            <Animated.View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              <Text style={[styles.prizeName, {color: colors.text}]}>{displayPrizeName}</Text>
              {displayPrizeDescription ? (
                <Text style={[styles.prizeDescription, {color: colors.textMuted}]}>
                  {displayPrizeDescription}
                </Text>
              ) : null}

              {/* Ticket Number Section */}
              <View style={[styles.ticketNumberSection, {backgroundColor: `${COLORS.primary}08`}]}>
                <View style={styles.ticketNumberHeader}>
                  <View style={[styles.ticketIconContainer, {backgroundColor: `${COLORS.primary}15`}]}>
                    <Ionicons name="ticket" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.ticketNumberLabel, {color: colors.textMuted}]}>
                    Il tuo numero
                  </Text>
                </View>
                <Text style={[styles.ticketNumber, {color: COLORS.primary}]}>
                  #{ticket.ticketNumber}
                </Text>
              </View>

              {/* Info Row */}
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoLabel, {color: colors.textMuted}]}>Partecipazione</Text>
                    <Text style={[styles.infoValue, {color: colors.text}]}>
                      {formatDate(ticket.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.infoDivider, {backgroundColor: colors.border}]} />

                <View style={styles.infoItem}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                  <View style={styles.infoTextContainer}>
                    <Text style={[styles.infoLabel, {color: colors.textMuted}]}>Stato</Text>
                    <Text style={[styles.infoValue, {color: COLORS.success}]}>Completato</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
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
    flex: 1,
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginRight: 44,
  },
  headerSpacer: {
    width: 0,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },

  // ========== WINNER VIEW ==========

  // Compact Winner Banner
  winnerBanner: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  winnerBannerGradient: {
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  bannerDecorRight: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  trophySmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerTextContainer: {
    flex: 1,
  },
  winnerBannerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  winnerBannerName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  bannerNumberSection: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  bannerNumberLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  bannerNumberValue: {
    fontSize: 40,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: SPACING.sm,
  },
  bannerFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bannerFooterText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.8)',
  },

  // Prize Showcase Card
  prizeShowcaseCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  showcaseImageContainer: {
    height: 220,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    position: 'relative',
  },
  showcasePrizeImage: {
    width: '85%',
    height: '100%',
    zIndex: 1,
  },
  imageGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  showcaseInfo: {
    padding: SPACING.lg,
  },
  showcasePrizeName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  showcaseDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },

  // Delivery Card
  deliveryCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  deliveryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  deliveryText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  deliveryEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  deliveryEmail: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
  // Timeline
  timeline: {
    marginBottom: SPACING.lg,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: {
    backgroundColor: '#00B894',
  },
  timelineDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  timelineStepContent: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  timelineStepDesc: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  timelineConnectorContainer: {
    paddingLeft: 13,
    paddingVertical: 2,
  },
  timelineConnector: {
    width: 2,
    height: 24,
  },
  timelineConnectorActive: {
    backgroundColor: '#00B894',
  },
  timelineConnectorInactive: {
    backgroundColor: '#E0E0E0',
  },

  // Support Note
  supportNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  supportNoteText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },

  // ========== NON-WINNER VIEW ==========

  imageCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    height: 220,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  prizeImage: {
    width: '85%',
    height: '100%',
  },
  infoCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  prizeName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  prizeDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  ticketNumberSection: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  ticketNumberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  ticketIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketNumberLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  ticketNumber: {
    fontSize: 42,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  infoDivider: {
    width: 1,
    height: 40,
    marginHorizontal: SPACING.md,
  },
});

export default TicketDetailScreen;
