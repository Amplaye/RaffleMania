import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useThemeColors} from '../../hooks/useThemeColors';
import {SPACING, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, RADIUS} from '../../utils/constants';

const CREDITS_PER_TICKET = 5;

interface AdOrCreditsModalProps {
  visible: boolean;
  userCredits: number;
  prizeName: string;
  onWatchAd: () => void;
  onUseCredits: () => void;
  onGoToShop: () => void;
  onClose: () => void;
}

export const AdOrCreditsModal: React.FC<AdOrCreditsModalProps> = ({
  visible,
  userCredits,
  prizeName,
  onWatchAd,
  onUseCredits,
  onGoToShop,
  onClose,
}) => {
  const {colors, isDark} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const hasEnoughCredits = userCredits >= CREDITS_PER_TICKET;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              transform: [{scale: scaleAnim}],
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>
              Ottieni Biglietto
            </Text>
            <Text style={[styles.subtitle, {color: colors.textMuted}]}>
              {prizeName}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Watch Ad Option */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={onWatchAd}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#FF6B00', '#E55A00']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.optionGradient}>
                <View style={styles.optionIconContainer}>
                  <Ionicons name="play-circle" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Guarda Ads</Text>
                  <Text style={styles.optionSubtitle}>Gratis</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, {backgroundColor: colors.border}]} />
              <Text style={[styles.dividerText, {color: colors.textMuted}]}>oppure</Text>
              <View style={[styles.dividerLine, {backgroundColor: colors.border}]} />
            </View>

            {/* Use Credits Option - or Go to Shop if insufficient */}
            {hasEnoughCredits ? (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onUseCredits}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#00B894', '#00A085']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.optionGradient}>
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="flash" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Usa Crediti</Text>
                    <Text style={styles.optionSubtitle}>
                      {CREDITS_PER_TICKET} crediti
                    </Text>
                  </View>
                  <View style={styles.creditsBalance}>
                    <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.creditsBalanceText}>{userCredits}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={onGoToShop}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#9B59B6', '#8E44AD']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.optionGradient}>
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="cart" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Acquista Crediti</Text>
                    <Text style={styles.optionSubtitle}>
                      Hai solo {userCredits} crediti
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, {borderColor: colors.border}]}
            onPress={handleClose}
            activeOpacity={0.7}>
            <Text style={[styles.closeButtonText, {color: colors.textMuted}]}>
              Annulla
            </Text>
          </TouchableOpacity>
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
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  optionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  optionButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  optionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  creditsBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditsBalanceText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginHorizontal: SPACING.sm,
  },
  insufficientText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  closeButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default AdOrCreditsModal;
