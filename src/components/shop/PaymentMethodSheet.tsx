import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, SPACING, RADIUS, FONT_SIZE, FONT_FAMILY, FONT_WEIGHT} from '../../utils/constants';
import {useThemeColors} from '../../hooks/useThemeColors';
import {ShopPackage} from '../../store/useGameConfigStore';

interface PaymentMethodSheetProps {
  visible: boolean;
  package_: ShopPackage | null;
  onSelectIAP: () => void;
  onSelectStripe: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const PaymentMethodSheet: React.FC<PaymentMethodSheetProps> = ({
  visible,
  package_,
  onSelectIAP,
  onSelectStripe,
  onClose,
  isLoading = false,
}) => {
  const {colors} = useThemeColors();

  if (!package_) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, {backgroundColor: colors.card}]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Title */}
          <Text style={[styles.title, {color: colors.text}]}>
            Scegli metodo di pagamento
          </Text>

          {/* Package info */}
          <View style={[styles.packageInfo, {backgroundColor: colors.inputBg}]}>
            <Text style={[styles.packageCredits, {color: COLORS.primary}]}>
              {package_.credits} Crediti
            </Text>
            <Text style={[styles.packagePrice, {color: colors.text}]}>
              {package_.price.toFixed(2)}€
            </Text>
          </View>

          {/* IAP Option (primary) */}
          <TouchableOpacity
            style={[styles.paymentOption, styles.paymentOptionPrimary]}
            onPress={onSelectIAP}
            disabled={isLoading}
            activeOpacity={0.8}>
            <View style={styles.paymentOptionIcon}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'}
                size={28}
                color={COLORS.white}
              />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={styles.paymentOptionTitle}>
                {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
              </Text>
              <Text style={styles.paymentOptionSubtitle}>
                Pagamento rapido e sicuro
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          {/* Stripe Option */}
          <TouchableOpacity
            style={[styles.paymentOption, {backgroundColor: colors.inputBg, borderColor: colors.border}]}
            onPress={onSelectStripe}
            disabled={isLoading}
            activeOpacity={0.8}>
            <View style={[styles.paymentOptionIcon, {backgroundColor: '#635BFF'}]}>
              <Ionicons name="card-outline" size={24} color={COLORS.white} />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={[styles.paymentOptionTitleDark, {color: colors.text}]}>
                Carta di credito/debito
              </Text>
              <Text style={[styles.paymentOptionSubtitleDark, {color: colors.textMuted}]}>
                Visa, Mastercard, Amex
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <Text style={[styles.cancelText, {color: colors.textMuted}]}>Annulla</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    paddingTop: SPACING.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  packageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  packageCredits: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  packagePrice: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentOptionPrimary: {
    backgroundColor: COLORS.primary,
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  paymentOptionSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  paymentOptionTitleDark: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  paymentOptionSubtitleDark: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.xs,
  },
  cancelText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default PaymentMethodSheet;
