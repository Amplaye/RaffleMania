import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useAuthStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {CreditPackage} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

// Mock credit packages
const creditPackages: CreditPackage[] = [
  {id: '1', credits: 100, price: 0.99, productId: 'credits_100', isPopular: false},
  {id: '2', credits: 500, price: 3.99, productId: 'credits_500', isPopular: true},
  {id: '3', credits: 1000, price: 6.99, productId: 'credits_1000', isPopular: false},
  {id: '4', credits: 2500, price: 14.99, productId: 'credits_2500', isPopular: false},
];

type PaymentMethod = 'stripe' | 'paypal';

interface CreditsScreenProps {
  navigation: any;
}

const PackageCard: React.FC<{
  pkg: CreditPackage;
  onSelect: () => void;
  colors: any;
}> = ({pkg, onSelect, colors}) => (
  <TouchableOpacity
    style={[styles.packageCard, pkg.isPopular && styles.packageCardPopular, {backgroundColor: colors.card}]}
    onPress={onSelect}
    activeOpacity={0.8}>
    {pkg.isPopular && (
      <View style={[styles.popularBadge, {backgroundColor: colors.primary}]}>
        <Text style={styles.popularBadgeText}>Popolare</Text>
      </View>
    )}
    <View style={styles.packageContent}>
      <View style={styles.creditsRow}>
        <Ionicons name="diamond" size={24} color={colors.primary} />
        <Text style={[styles.creditsAmount, {color: colors.text}]}>{pkg.credits.toLocaleString()}</Text>
      </View>
      <Text style={[styles.creditsLabel, {color: colors.textMuted}]}>crediti</Text>
    </View>
    <LinearGradient
      colors={pkg.isPopular ? [COLORS.primary, '#FF8500'] : [COLORS.textMuted, COLORS.textSecondary]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={styles.priceButton}>
      <Text style={styles.priceText}>€{pkg.price.toFixed(2)}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export const CreditsScreen: React.FC<CreditsScreenProps> = ({navigation}) => {
  const {colors} = useThemeColors();
  const {user, updateUser} = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const handlePayment = async (method: PaymentMethod) => {
    if (!selectedPackage) return;

    setShowPaymentModal(false);
    setIsLoading(true);

    // Simulate payment processing
    await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

    // Update user credits
    if (user) {
      updateUser({credits: user.credits + selectedPackage.credits});
    }

    setIsLoading(false);
    setSelectedPackage(null);

    Alert.alert(
      'Acquisto completato!',
      `Hai ricevuto ${selectedPackage.credits} crediti tramite ${method === 'stripe' ? 'Carta' : 'PayPal'}.`,
      [{text: 'OK'}],
    );
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={[COLORS.primary, '#FF6B00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.balanceGradient}>
              <View style={styles.balanceContent}>
                <Text style={styles.balanceLabel}>Saldo attuale</Text>
                <View style={styles.balanceRow}>
                  <Ionicons name="diamond" size={32} color={COLORS.white} />
                  <Text style={styles.balanceAmount}>
                    {(user?.credits || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.balanceSubtext}>crediti disponibili</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, {backgroundColor: colors.card}]}>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconContainer, {backgroundColor: `${colors.primary}15`}]}>
              <Ionicons name="flash" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, {color: colors.text}]}>Acquista crediti</Text>
              <Text style={[styles.infoSubtitle, {color: colors.textMuted}]}>Supporta lo sviluppo dell'app</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoIconContainer, {backgroundColor: `${colors.primary}15`}]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, {color: colors.text}]}>Pagamenti sicuri</Text>
              <Text style={[styles.infoSubtitle, {color: colors.textMuted}]}>Stripe e PayPal</Text>
            </View>
          </View>
        </View>

        {/* Packages */}
        <View style={styles.packagesSection}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Scegli un pacchetto</Text>
          <View style={styles.packagesGrid}>
            {creditPackages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                colors={colors}
                onSelect={() => handleSelectPackage(pkg)}
              />
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, {color: colors.textMuted}]}>
          I pagamenti sono processati in modo sicuro tramite Stripe e PayPal.
          I crediti non hanno scadenza e non sono rimborsabili.
        </Text>
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Scegli metodo di pagamento</Text>
            {selectedPackage && (
              <Text style={[styles.modalSubtitle, {color: colors.textMuted}]}>
                {selectedPackage.credits} crediti - €{selectedPackage.price.toFixed(2)}
              </Text>
            )}

            {/* Stripe Button */}
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => handlePayment('stripe')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#635BFF', '#8B85FF']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.paymentButtonGradient}>
                <Ionicons name="card" size={24} color={COLORS.white} />
                <Text style={styles.paymentButtonText}>Paga con Carta</Text>
                <Text style={styles.paymentBrand}>Stripe</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* PayPal Button */}
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => handlePayment('paypal')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#003087', '#009CDE']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.paymentButtonGradient}>
                <Ionicons name="logo-paypal" size={24} color={COLORS.white} />
                <Text style={styles.paymentButtonText}>Paga con PayPal</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}>
              <Text style={[styles.cancelButtonText, {color: colors.textMuted}]}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.md,
  },
  balanceCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceGradient: {
    padding: SPACING.xl,
  },
  balanceContent: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 48,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  balanceSubtext: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.xs,
  },
  infoSection: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  infoSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  packagesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  packageCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardPopular: {
    borderColor: COLORS.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  popularBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  packageContent: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  creditsAmount: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  creditsLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  priceButton: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  priceText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },
  // Modal styles
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
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  paymentButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  paymentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  paymentButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    flex: 1,
  },
  paymentBrand: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.8)',
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textMuted,
  },
});

export default CreditsScreen;
