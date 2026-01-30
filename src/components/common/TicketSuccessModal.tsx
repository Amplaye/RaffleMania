import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

export interface TicketSuccessInfo {
  ticketNumbers: number[];
  prizeName: string;
  totalUserNumbers?: number[];
  totalPoolTickets?: number;
}

interface TicketSuccessModalProps {
  visible: boolean;
  ticketInfo: TicketSuccessInfo | null;
  onClose: () => void;
}

export const TicketSuccessModal: React.FC<TicketSuccessModalProps> = ({
  visible,
  ticketInfo,
  onClose,
}) => {
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
            toValue: 1.05,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(ticketScaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start();

        // Confetti animation
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible, scaleAnim, opacityAnim, ticketScaleAnim, confettiAnim]);

  if (!ticketInfo) return null;

  const isBatch = ticketInfo.ticketNumbers.length > 1;
  const ticketCount = ticketInfo.ticketNumbers.length;

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
          {/* Success Icon with Glow */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconGlow,
                {
                  opacity: confettiAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0.6],
                  }),
                  transform: [
                    {
                      scale: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              style={styles.iconGradient}>
              <Ionicons name="ticket" size={40} color={COLORS.white} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isBatch ? `${ticketCount} Numeri Ottenuti!` : 'Nuovo Numero Ottenuto!'}
          </Text>
          <Text style={styles.subtitle}>
            {isBatch
              ? `Hai ${ticketCount} nuovi numeri per l'estrazione`
              : 'Hai un nuovo numero per l\'estrazione'}
          </Text>

          {/* Ticket Numbers Card */}
          <Animated.View
            style={[
              styles.ticketCard,
              {transform: [{scale: ticketScaleAnim}]},
            ]}>
            <LinearGradient
              colors={[COLORS.primary, '#FF6B00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.ticketGradient}>
              <View style={styles.ticketContent}>
                <View style={styles.ticketHeader}>
                  <Ionicons name="ticket" size={18} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.ticketLabel}>
                    {isBatch ? 'I TUOI NUMERI' : 'IL TUO NUMERO'}
                  </Text>
                  {isBatch && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>x{ticketCount}</Text>
                    </View>
                  )}
                </View>

                {/* Numbers Display */}
                <ScrollView
                  horizontal={!isBatch || ticketCount <= 5}
                  showsHorizontalScrollIndicator={false}
                  style={styles.numbersScroll}
                  contentContainerStyle={styles.numbersContainer}>
                  {isBatch ? (
                    <View style={styles.numbersGrid}>
                      {ticketInfo.ticketNumbers.map((num, index) => (
                        <View key={index} style={styles.numberChip}>
                          <Text style={styles.numberChipText}>#{num}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.singleNumber}>
                      #{ticketInfo.ticketNumbers[0]}
                    </Text>
                  )}
                </ScrollView>

                <View style={styles.ticketDivider} />

                {/* Prize Name */}
                <View style={styles.prizeRow}>
                  <Ionicons name="gift" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.prizeName}>{ticketInfo.prizeName}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Probability Info */}
          {ticketInfo.totalUserNumbers && ticketInfo.totalPoolTickets && (
            <View style={styles.probabilityContainer}>
              <LinearGradient
                colors={['#00B894', '#00A085']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.probabilityGradient}>
                <View style={styles.probabilityContent}>
                  <Ionicons name="trending-up" size={18} color={COLORS.white} />
                  <View style={styles.probabilityTextContainer}>
                    <Text style={styles.probabilityTitle}>Le tue probabilita</Text>
                    <Text style={styles.probabilitySubtitle}>
                      {ticketInfo.totalUserNumbers.length} numer{ticketInfo.totalUserNumbers.length === 1 ? 'o' : 'i'} su {ticketInfo.totalPoolTickets} totali
                    </Text>
                  </View>
                  <View style={styles.probabilityBadge}>
                    <Text style={styles.probabilityValue}>
                      {((ticketInfo.totalUserNumbers.length / ticketInfo.totalPoolTickets) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Good Luck Message */}
          <View style={styles.luckContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.luckText}>Buona fortuna!</Text>
            <Ionicons name="star" size={16} color="#FFD700" />
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.closeButtonGradient}>
              <Text style={styles.closeButtonText}>Continua</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  iconContainer: {
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    top: -10,
    left: -10,
    opacity: 0.3,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Required for iOS borderRadius
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  ticketCard: {
    width: '100%',
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden', // Required for iOS borderRadius on children
  },
  ticketGradient: {
    borderRadius: RADIUS.lg,
  },
  ticketContent: {
    padding: SPACING.lg,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  ticketLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    flex: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  countBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  numbersScroll: {
    maxHeight: 100,
  },
  numbersContainer: {
    flexGrow: 1,
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  numberChipText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  singleNumber: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 2,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: SPACING.md,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prizeName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.white,
  },
  probabilityContainer: {
    width: '100%',
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  probabilityGradient: {
    borderRadius: RADIUS.lg,
  },
  probabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  probabilityTextContainer: {
    flex: 1,
  },
  probabilityTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  probabilitySubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  probabilityBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  probabilityValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  luckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  luckText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});

export default TicketSuccessModal;
