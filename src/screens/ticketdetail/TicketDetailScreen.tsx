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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const ticket = [...activeTickets, ...pastTickets].find(t => t.id === ticketId);
  const prize = ticket?.prizeId ? prizes.find(p => p.id === ticket.prizeId) : null;

  const displayPrizeName = ticket?.prizeName || prize?.name || 'Premio';
  const displayPrizeImage = ticket?.prizeImage || prize?.imageUrl;
  const displayPrizeDescription = prize?.description || '';

  const imageBackgroundColors = ['#FFF8F0', '#FFF5E6', '#FFECD2'];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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
            style={[styles.backButton, {backgroundColor: colors.card}]}
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
          style={[styles.backButton, {backgroundColor: colors.card}]}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          {isWinner ? 'Hai Vinto!' : 'Dettaglio'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{opacity: fadeAnim, transform: [{scale: scaleAnim}]}}>

          {/* Main Card - Same style as PrizeCard */}
          <View style={[styles.card, {backgroundColor: colors.card}]}>

            {/* Image Section with cream gradient */}
            <View style={styles.imageContainer}>
              <LinearGradient
                colors={imageBackgroundColors}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
                style={StyleSheet.absoluteFill}>
                <View style={styles.imageWrapper}>
                  {displayPrizeImage && (
                    <Image
                      source={{uri: displayPrizeImage}}
                      style={styles.prizeImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              </LinearGradient>

              <View style={styles.imageSeparator} />
            </View>

            {/* Info Section */}
            <View style={styles.infoContainer}>
              {/* Prize Name */}
              <Text style={[styles.prizeName, {color: colors.text}]}>
                {displayPrizeName}
              </Text>

              {/* Description */}
              {displayPrizeDescription && (
                <Text style={[styles.prizeDescription, {color: colors.textMuted}]} numberOfLines={2}>
                  {displayPrizeDescription}
                </Text>
              )}

              {/* Ticket Number Box */}
              <View style={[styles.numberBox, {backgroundColor: isWinner ? '#FFF8E1' : `${COLORS.primary}10`}]}>
                <View style={styles.numberHeader}>
                  <Ionicons
                    name="ticket"
                    size={14}
                    color={isWinner ? '#FF8C00' : COLORS.primary}
                  />
                  <Text style={[styles.numberLabel, {color: isWinner ? '#F57C00' : colors.textMuted}]}>
                    {isWinner ? 'Numero Vincente' : 'Il tuo numero'}
                  </Text>
                </View>
                <Text style={[styles.ticketNumber, {color: isWinner ? '#FF8C00' : COLORS.primary}]}>
                  #{ticket.ticketNumber}
                </Text>
              </View>

              {/* Date */}
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color={isWinner ? '#000000' : colors.textMuted} />
                <Text style={[
                  styles.dateText,
                  {color: isWinner ? '#000000' : colors.textMuted},
                  isWinner && styles.dateTextBold
                ]}>
                  {isWinner
                    ? `Vinto il ${formatDate(ticket.wonAt || ticket.createdAt)}`
                    : `Partecipazione: ${formatDate(ticket.createdAt)}`
                  }
                </Text>
              </View>

              {/* Status */}
              <View style={[styles.statusRow, {backgroundColor: isWinner ? '#E8F5E9' : `${colors.success}10`}]}>
                <Ionicons
                  name={isWinner ? 'trophy' : 'checkmark-circle'}
                  size={16}
                  color={isWinner ? '#4CAF50' : colors.success}
                />
                <Text style={[styles.statusText, {color: isWinner ? '#4CAF50' : colors.success}]}>
                  {isWinner ? 'Premio Vinto!' : 'Estrazione completata'}
                </Text>
              </View>
            </View>
          </View>

          {/* Shipping Card - Winners Only */}
          {isWinner && (
            <View style={[styles.shippingCard, {backgroundColor: colors.card}]}>
              <View style={styles.shippingHeader}>
                <View style={styles.shippingIconContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.shippingIconGradient}>
                    <Ionicons name="cube" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={[styles.shippingTitle, {color: colors.text}]}>Spedizione</Text>
              </View>
              <Text style={[styles.shippingText, {color: colors.textSecondary}]}>
                Il premio verrà spedito all'indirizzo registrato. Riceverai un'email con il tracking.
              </Text>
              <View style={styles.shippingStatusRow}>
                <View style={styles.shippingDot} />
                <Text style={styles.shippingStatusText}>In preparazione</Text>
              </View>
            </View>
          )}

        </Animated.View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Main Card - Same as PrizeCard
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
    marginBottom: SPACING.lg,
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

  // Info Section
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

  // Number Box
  numberBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  numberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  numberLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  ticketNumber: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  dateTextBold: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Shipping Card
  shippingCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  shippingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  shippingIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippingTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  shippingText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  shippingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shippingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFA500',
  },
  shippingStatusText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: '#FFA500',
  },
});

export default TicketDetailScreen;
