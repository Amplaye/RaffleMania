import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useTicketsStore, usePrizesStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
import {formatDate, formatTicketCode} from '../../utils/formatters';

interface TicketDetailScreenProps {
  route: {params: {ticketId: string}};
  navigation: any;
}

export const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({route}) => {
  const {colors} = useThemeColors();
  const {ticketId} = route.params;
  const {activeTickets, pastTickets} = useTicketsStore();
  const {prizes} = usePrizesStore();

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Find ticket in active or past tickets
  const ticket = [...activeTickets, ...pastTickets].find(t => t.id === ticketId);
  const prize = ticket ? prizes.find(p => p.id === ticket.prizeId) : null;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!ticket || !prize) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, {color: colors.textMuted}]}>Biglietto non trovato</Text>
        </View>
      </ScreenContainer>
    );
  }

  const isWinner = ticket.isWinner;
  const isActive = activeTickets.some(t => t.id === ticketId);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Prize Image Card */}
        <Animated.View
          style={[
            styles.imageCard,
            {
              opacity: opacityAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {isWinner && (
            <LinearGradient
              colors={['#FFD700', '#FFA000', '#FF8C00']}
              style={styles.winnerBorder}>
              <View style={styles.imageContainer}>
                <Image
                  source={{uri: prize.imageUrl}}
                  style={styles.prizeImage}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          )}
          {!isWinner && (
            <View style={[styles.imageContainerNormal, {backgroundColor: colors.card}]}>
              <Image
                source={{uri: prize.imageUrl}}
                style={styles.prizeImage}
                resizeMode="contain"
              />
            </View>
          )}
        </Animated.View>

        {/* Winner Badge */}
        {isWinner && (
          <View style={styles.winnerBadge}>
            <LinearGradient
              colors={['#FFD700', '#FFA000']}
              style={styles.winnerBadgeGradient}>
              <Ionicons name="trophy" size={20} color={COLORS.white} />
              <Text style={styles.winnerBadgeText}>HAI VINTO!</Text>
            </LinearGradient>
          </View>
        )}

        {/* Status Badge */}
        {!isWinner && (
          <View style={[styles.statusBadge, isActive ? {backgroundColor: `${colors.primary}15`} : {backgroundColor: `${colors.success}15`}]}>
            <Ionicons
              name={isActive ? 'time' : 'checkmark-circle'}
              size={16}
              color={isActive ? colors.primary : colors.success}
            />
            <Text style={[styles.statusText, isActive ? {color: colors.primary} : {color: colors.success}]}>
              {isActive ? 'In attesa dell\'estrazione' : 'Estrazione completata'}
            </Text>
          </View>
        )}

        {/* Prize Name */}
        <Text style={[styles.prizeName, {color: colors.text}]}>{prize.name}</Text>

        {/* Ticket Info Card */}
        <Card style={styles.infoCard}>
          <Text style={[styles.infoTitle, {color: colors.text}]}>Dettagli Biglietto</Text>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, {backgroundColor: `${colors.primary}15`}]}>
              <Ionicons name="ticket" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {color: colors.textMuted}]}>Codice biglietto</Text>
              <Text style={[styles.infoValue, {color: colors.text}]}>{formatTicketCode(ticket.uniqueCode)}</Text>
            </View>
          </View>

          <View style={[styles.infoDivider, {backgroundColor: colors.border}]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, {backgroundColor: `${colors.primary}15`}]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, {color: colors.textMuted}]}>Data partecipazione</Text>
              <Text style={[styles.infoValue, {color: colors.text}]}>{formatDate(ticket.createdAt)}</Text>
            </View>
          </View>
        </Card>

        {/* Prize Description */}
        <Card style={styles.descriptionCard}>
          <Text style={[styles.descriptionTitle, {color: colors.text}]}>Descrizione Premio</Text>
          <Text style={[styles.descriptionText, {color: colors.textSecondary}]}>{prize.description}</Text>
        </Card>

        {/* Winner Shipping Info */}
        {isWinner && (
          <Card style={styles.shippingCard}>
            <LinearGradient
              colors={['#FFD700', '#FFA000']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.shippingHeader}>
              <Ionicons name="cube" size={20} color={COLORS.white} />
              <Text style={styles.shippingTitle}>Spedizione</Text>
            </LinearGradient>
            <View style={styles.shippingContent}>
              <Text style={[styles.shippingText, {color: colors.textSecondary}]}>
                Complimenti! Il tuo premio verra spedito all'indirizzo registrato.
                Riceverai un'email con il tracking non appena sara disponibile.
              </Text>
              <View style={styles.shippingStatus}>
                <View style={styles.shippingDot} />
                <Text style={styles.shippingStatusText}>In preparazione</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  imageCard: {
    marginBottom: SPACING.md,
  },
  imageContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl - 3,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  imageContainerNormal: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  winnerBorder: {
    padding: 3,
    borderRadius: RADIUS.xl,
  },
  prizeImage: {
    width: 200,
    height: 200,
  },
  winnerBadge: {
    alignSelf: 'center',
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  winnerBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  winnerBadgeText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  activeBadge: {
    backgroundColor: `${COLORS.primary}15`,
  },
  expiredBadge: {
    backgroundColor: `${COLORS.success}15`,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  activeText: {
    color: COLORS.primary,
  },
  expiredText: {
    color: COLORS.success,
  },
  prizeName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  prizeValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  descriptionCard: {
    marginBottom: SPACING.md,
  },
  descriptionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  descriptionText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  shippingCard: {
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    marginHorizontal: -SPACING.md,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  shippingTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  shippingContent: {
    paddingTop: SPACING.xs,
  },
  shippingText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  shippingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  shippingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFA000',
  },
  shippingStatusText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: '#FFA000',
  },
});

export default TicketDetailScreen;
