import React, {useEffect, useRef} from 'react';
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
import {useTicketsStore, usePrizesStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {AnimatedBackground} from '../../components/common';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
        {/* Winner Celebration Banner */}
        {isWinner && (
          <Animated.View
            style={[
              styles.winnerBanner,
              {
                opacity: fadeAnim,
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.winnerBannerGradient}>
              <Ionicons name="trophy" size={32} color="#FFFFFF" />
              <Text style={styles.winnerBannerText}>Congratulazioni!</Text>
              <Text style={styles.winnerBannerSubtext}>Hai vinto questo premio</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Prize Image Card */}
        <Animated.View
          style={[
            styles.imageCard,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
              borderColor: isWinner ? '#FFD700' : `${COLORS.primary}50`,
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
          {displayPrizeDescription && (
            <Text style={[styles.prizeDescription, {color: colors.textMuted}]}>
              {displayPrizeDescription}
            </Text>
          )}

          {/* Ticket Number Section */}
          <View style={[styles.ticketNumberSection, {backgroundColor: isWinner ? '#FFF8E1' : `${COLORS.primary}08`}]}>
            <View style={styles.ticketNumberHeader}>
              <View style={[styles.ticketIconContainer, {backgroundColor: isWinner ? '#FFE082' : `${COLORS.primary}15`}]}>
                <Ionicons name="ticket" size={20} color={isWinner ? '#FF8C00' : COLORS.primary} />
              </View>
              <Text style={[styles.ticketNumberLabel, {color: isWinner ? '#F57C00' : colors.textMuted}]}>
                {isWinner ? 'Numero Vincente' : 'Il tuo numero'}
              </Text>
            </View>
            <Text style={[styles.ticketNumber, {color: isWinner ? '#FF8C00' : COLORS.primary}]}>
              #{ticket.ticketNumber}
            </Text>
          </View>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, {color: colors.textMuted}]}>
                  {isWinner ? 'Vinto il' : 'Partecipazione'}
                </Text>
                <Text style={[styles.infoValue, {color: colors.text}]}>
                  {formatDate(isWinner ? (ticket.wonAt || ticket.createdAt) : ticket.createdAt)}
                </Text>
              </View>
            </View>

            <View style={[styles.infoDivider, {backgroundColor: colors.border}]} />

            <View style={styles.infoItem}>
              <Ionicons
                name={isWinner ? 'trophy' : 'checkmark-circle'}
                size={18}
                color={isWinner ? '#FFD700' : COLORS.success}
              />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, {color: colors.textMuted}]}>Stato</Text>
                <Text style={[styles.infoValue, {color: isWinner ? '#FF8C00' : COLORS.success}]}>
                  {isWinner ? 'Vincitore!' : 'Completato'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Shipping Card - Winners Only */}
        {isWinner && (
          <Animated.View
            style={[
              styles.shippingCard,
              {
                backgroundColor: colors.card,
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <View style={styles.shippingHeader}>
              <View style={styles.shippingIconContainer}>
                <LinearGradient
                  colors={['#4CAF50', '#45A049']}
                  style={styles.shippingIconGradient}>
                  <Ionicons name="cube" size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.shippingTitleContainer}>
                <Text style={[styles.shippingTitle, {color: colors.text}]}>Spedizione</Text>
                <Text style={[styles.shippingSubtitle, {color: colors.textMuted}]}>
                  Traccia il tuo premio
                </Text>
              </View>
            </View>

            <View style={styles.shippingTimeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotCompleted]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, {color: colors.text}]}>Ordine confermato</Text>
                  <Text style={[styles.timelineDate, {color: colors.textMuted}]}>
                    {formatDate(ticket.wonAt || ticket.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={[styles.timelineLine, {backgroundColor: '#FFA500'}]} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, {color: colors.text}]}>In preparazione</Text>
                  <Text style={[styles.timelineDate, {color: colors.textMuted}]}>
                    In lavorazione
                  </Text>
                </View>
              </View>

              <View style={[styles.timelineLine, {backgroundColor: colors.border}]} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotPending]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, {color: colors.textMuted}]}>Spedito</Text>
                  <Text style={[styles.timelineDate, {color: colors.textMuted}]}>
                    In attesa
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.shippingNote, {backgroundColor: `${COLORS.primary}08`}]}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={[styles.shippingNoteText, {color: colors.textSecondary}]}>
                Riceverai un'email con il tracking non appena il pacco sarà spedito.
              </Text>
            </View>
          </Animated.View>
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

  // Winner Banner
  winnerBanner: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  winnerBannerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  winnerBannerText: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    marginTop: SPACING.sm,
  },
  winnerBannerSubtext: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },

  // Image Card
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

  // Info Card
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

  // Ticket Number Section
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

  // Info Row
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

  // Shipping Card
  shippingCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  shippingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  shippingIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippingTitleContainer: {
    flex: 1,
  },
  shippingTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  shippingSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },

  // Timeline
  shippingTimeline: {
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineDotActive: {
    backgroundColor: '#FFA500',
    borderWidth: 3,
    borderColor: '#FFE082',
  },
  timelineDotPending: {
    backgroundColor: '#E0E0E0',
  },
  timelineLine: {
    width: 2,
    height: 24,
    marginLeft: 6,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: SPACING.xs,
  },
  timelineTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  timelineDate: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },

  // Shipping Note
  shippingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  shippingNoteText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
});

export default TicketDetailScreen;
