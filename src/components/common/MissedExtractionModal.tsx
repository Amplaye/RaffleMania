import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Modal, TouchableOpacity, Image, Platform} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FONT_FAMILY, FONT_WEIGHT, FONT_SIZE, RADIUS, SPACING, COLORS} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';
import {MissedExtraction} from '../../store/useExtractionStore';

interface MissedExtractionModalProps {
  visible: boolean;
  extraction: MissedExtraction | null;
  currentIndex: number;
  totalCount: number;
  onDismiss: () => void;
}

export const MissedExtractionModal: React.FC<MissedExtractionModalProps> = ({
  visible,
  extraction,
  currentIndex,
  totalCount,
  onDismiss,
}) => {
  const {colors, isDark} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, currentIndex, scaleAnim, opacityAnim]);

  if (!visible || !extraction) return null;

  const isLast = currentIndex >= totalCount - 1;
  const buttonText = isLast ? 'Chiudi' : 'Avanti';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <Animated.View style={[styles.container, {transform: [{scale: scaleAnim}]}]}>
          {extraction.isWinner ? (
            <LinearGradient
              colors={['#FFB347', '#FF9636', '#FF7F24']}
              style={styles.gradient}>
              <View style={styles.content}>
                <View style={styles.headerBadge}>
                  <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.headerBadgeText}>Estrazione Completata</Text>
                </View>

                {totalCount > 1 && (
                  <Text style={styles.counterText}>{currentIndex + 1} di {totalCount}</Text>
                )}

                <Text style={styles.winnerTitle}>HAI VINTO!</Text>

                {extraction.prizeImage && (
                  <View style={styles.prizeImageContainer}>
                    <Image source={{uri: extraction.prizeImage}} style={styles.prizeImage} resizeMode="contain" />
                  </View>
                )}

                <Text style={styles.prizeName}>{extraction.prizeName}</Text>

                <View style={styles.numberBox}>
                  <Text style={styles.numberLabel}>Numero Estratto</Text>
                  <Text style={styles.winningNumber}>#{extraction.winningNumber}</Text>
                  <Text style={styles.winnerMessage}>Il numero #{extraction.winningNumber} era tuo!</Text>
                </View>

                <TouchableOpacity style={styles.winnerButton} onPress={onDismiss}>
                  <Text style={styles.winnerButtonText}>{buttonText}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.loserContainer}>
              <View style={styles.headerBadgeDark}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.headerBadgeTextDark}>Estrazione Completata</Text>
              </View>

              {totalCount > 1 && (
                <Text style={[styles.counterTextDark, {color: colors.textSecondary}]}>{currentIndex + 1} di {totalCount}</Text>
              )}

              <View style={styles.sadCircle}>
                <Ionicons name="sad-outline" size={50} color="#888" />
              </View>

              <Text style={[styles.loserTitle, {color: colors.text}]}>Peccato!</Text>
              <Text style={[styles.loserSubtitle, {color: colors.textSecondary}]}>Non hai vinto questa volta</Text>

              <View style={[styles.extractedNumberBox, {backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'}]}>
                <Text style={[styles.extractedNumberLabel, {color: colors.textSecondary}]}>Numero Estratto</Text>
                <Text style={[styles.extractedNumber, {color: colors.text}]}>#{extraction.winningNumber}</Text>
              </View>

              {extraction.userNumbers.length > 0 && (
                <View style={styles.userNumbersBox}>
                  <Text style={styles.userNumbersLabel}>I tuoi numeri erano:</Text>
                  <Text style={styles.userNumbersList}>
                    {extraction.userNumbers.map(n => `#${n}`).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.encouragementBox}>
                <Ionicons name="flash" size={24} color={COLORS.primary} />
                <Text style={styles.encouragementText}>
                  Più numeri hai, più chance di vincere! Continua a partecipare.
                </Text>
              </View>

              <TouchableOpacity style={styles.loserButton} onPress={onDismiss}>
                <LinearGradient
                  colors={[COLORS.primary, '#FF8500']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.loserButtonGradient}>
                  <View style={styles.loserButtonContent}>
                    <Text style={styles.loserButtonText}>{buttonText}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: RADIUS.xl,
  },
  content: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  headerBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.9)',
  },
  headerBadgeDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: 6,
  },
  headerBadgeTextDark: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: '#666',
  },
  counterText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.sm,
  },
  counterTextDark: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: SPACING.sm,
  },
  winnerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    marginBottom: SPACING.sm,
  },
  prizeImageContainer: {
    width: 200,
    height: 200,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImage: {
    width: '100%',
    height: '100%',
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  numberBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  numberLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  winningNumber: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    marginVertical: 4,
  },
  winnerMessage: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  winnerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  winnerButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FF8C00',
  },
  // Loser styles
  loserContainer: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  sadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  loserTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  loserSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
  },
  extractedNumberBox: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  extractedNumberLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  extractedNumber: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  userNumbersBox: {
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  userNumbersLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: '#666',
    marginBottom: 4,
  },
  userNumbersList: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  encouragementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: 12,
  },
  encouragementText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: '#555',
    lineHeight: 20,
  },
  loserButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loserButtonGradient: {
    borderRadius: RADIUS.lg,
  },
  loserButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    minHeight: Platform.OS === 'ios' ? 56 : 48,
  },
  loserButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    paddingHorizontal: SPACING.sm,
  },
});

export default MissedExtractionModal;
