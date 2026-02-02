import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground} from '../../components/common';
import {useAuthStore, useCreditsStore, useTicketsStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface ShopScreenProps {
  navigation: any;
}

// Credit Package data
const CREDIT_PACKAGES = [
  {id: '1', credits: 10, price: 0.99, badge: null, discount: null},
  {id: '2', credits: 25, price: 1.99, badge: null, discount: null},
  {id: '3', credits: 60, price: 2.99, badge: 'most popular', discount: '-50%'},
  {id: '4', credits: 100, price: 4.49, badge: null, discount: null},
  {id: '5', credits: 250, price: 9.99, badge: null, discount: null},
  {id: '6', credits: 600, price: 19.99, badge: null, discount: null},
  {id: '7', credits: 1000, price: 29.99, badge: null, discount: '-69%'},
  {id: '8', credits: 2500, price: 59.99, badge: null, discount: '-76%'},
  {id: '9', credits: 6000, price: 99.99, badge: 'best value', discount: '-83%'},
];

// Credit Package Card
interface CreditPackageProps {
  package_: typeof CREDIT_PACKAGES[0];
  onPress: () => void;
}

const CreditPackageCard: React.FC<CreditPackageProps> = ({package_, onPress}) => {
  const {colors} = useThemeColors();
  const isHighlighted = package_.badge !== null;

  return (
    <TouchableOpacity
      style={[
        styles.packageCard,
        {backgroundColor: colors.card},
        isHighlighted && styles.packageCardHighlighted,
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      {package_.badge && (
        <View style={[
          styles.packageBadge,
          package_.badge === 'best value' ? styles.packageBadgeBestValue : styles.packageBadgePopular,
        ]}>
          <Text style={styles.packageBadgeText}>{package_.badge}</Text>
        </View>
      )}
      <Text style={[styles.packageCredits, {color: colors.text}]}>{package_.credits}</Text>
      <Text style={[styles.packageCreditsLabel, {color: colors.textMuted}]}>CREDITI</Text>
      <Text style={styles.packagePrice}>{package_.price.toFixed(2)}€</Text>
      {package_.discount && (
        <Text style={styles.packageDiscount}>{package_.discount}</Text>
      )}
    </TouchableOpacity>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({navigation: _navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const user = useAuthStore(state => state.user);
  const {addCredits} = useCreditsStore();
  const {getAdCooldownSeconds} = useTicketsStore();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Ad cooldown countdown
  useEffect(() => {
    const updateCooldown = () => {
      setCooldownSeconds(getAdCooldownSeconds());
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format ad cooldown in mm:ss
  const formatAdCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRemoveBanner = () => {
    Alert.alert(
      'Rimuovi Banner Pubblicitari',
      'Acquistando questa opzione verrà rimossa solo la visualizzazione del banner pubblicitario in alto.\n\nPer ottenere crediti e biglietti gratuiti dovrai continuare a guardare le pubblicità video.',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Acquista (0.99€)',
          onPress: () => {
            // TODO: Implement actual purchase
            Alert.alert('Successo!', 'I banner pubblicitari sono stati rimossi!');
          },
        },
      ],
    );
  };

  const handlePurchase = (package_: typeof CREDIT_PACKAGES[0]) => {
    // TODO: Implement actual purchase with payment provider
    Alert.alert(
      'Acquista Crediti',
      `Vuoi acquistare ${package_.credits} crediti per ${package_.price.toFixed(2)}€?`,
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Acquista',
          onPress: () => {
            // Mock purchase - in production this would go through payment provider
            addCredits(package_.credits, 'purchase');
            Alert.alert('Successo!', `Hai acquistato ${package_.credits} crediti!`);
          },
        },
      ],
    );
  };

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    // Simulate watching ad
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    addCredits(1, 'other');
    setIsWatchingAd(false);
    Alert.alert('Credito Guadagnato!', 'Hai ricevuto 1 credito gratuito!');
  };

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Banner Pubblicitario */}
          <View style={[styles.bannerContainer, {backgroundColor: colors.card}]}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Ionicons name="megaphone" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.bannerTextContainer}>
                <Text style={[styles.bannerTitle, {color: colors.text}]}>Il tuo brand qui!</Text>
                <Text style={[styles.bannerSubtitle, {color: colors.textMuted}]}>Sponsorizza la tua azienda</Text>
              </View>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>AD</Text>
              </View>
            </View>
          </View>

          {/* Info Row: Crediti Residui + Pagamenti Accettati */}
          <View style={styles.infoRow}>
            <View style={[styles.infoBox, {backgroundColor: colors.card}]}>
              <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
              <Text style={[styles.infoBoxTitle, {color: colors.textMuted}]}>CREDITI RESIDUI</Text>
              <Text style={[styles.infoBoxValue, {color: colors.text}]}>{user?.credits ?? 0}</Text>
            </View>
            <View style={[styles.infoBox, {backgroundColor: colors.card}]}>
              <View style={styles.paymentIcons}>
                <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                <Ionicons name="logo-apple" size={20} color={COLORS.primary} />
                <Ionicons name="logo-google" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.infoBoxTitle, {color: colors.textMuted}]}>PAGAMENTI ACCETTATI</Text>
              <Text style={[styles.infoBoxValue, {color: colors.text}]}>Carte, Apple Pay, Google Pay</Text>
            </View>
          </View>

          {/* Credit Packages Grid */}
          <View style={styles.packagesGrid}>
            {CREDIT_PACKAGES.map((pkg) => (
              <CreditPackageCard
                key={pkg.id}
                package_={pkg}
                onPress={() => handlePurchase(pkg)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomSection}>
        {/* Remove Banner Button */}
        <TouchableOpacity
          style={[styles.removeBannerButton, {backgroundColor: colors.card}]}
          onPress={handleRemoveBanner}
          activeOpacity={0.8}>
          <Ionicons name="close-circle-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.removeBannerText, {color: colors.text}]}>
            RIMUOVI BANNER PUBBLICITÀ
          </Text>
        </TouchableOpacity>

        {/* Watch Ad Button */}
        <TouchableOpacity
          style={[styles.watchAdButton, {backgroundColor: colors.card}, cooldownSeconds > 0 && styles.buttonDisabled]}
          onPress={handleWatchAd}
          disabled={isWatchingAd || cooldownSeconds > 0}
          activeOpacity={0.8}>
          <LinearGradient
            colors={cooldownSeconds === 0 ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.watchAdGradient}>
            <Ionicons name="play-circle" size={24} color={COLORS.white} />
            <Text style={styles.watchAdText}>
              {isWatchingAd ? 'GUARDANDO...' : cooldownSeconds > 0 ? `ATTENDI ${formatAdCooldown(cooldownSeconds)}` : 'GUARDA PUBBLICITÀ E GUADAGNA UN CREDITO'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },
  // Banner
  bannerContainer: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  bannerBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bannerBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  infoBoxTitle: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  infoBoxValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
    textAlign: 'center',
  },
  paymentIcons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  // Packages Grid
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  packageCard: {
    width: '31%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
    position: 'relative',
  },
  packageCardHighlighted: {
    // Border rimosso
  },
  packageBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packageBadgePopular: {
    backgroundColor: COLORS.primary,
  },
  packageBadgeBestValue: {
    backgroundColor: '#00B894',
  },
  packageBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
  },
  packageCredits: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  packageCreditsLabel: {
    fontSize: 8,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  packagePrice: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  packageDiscount: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#00B894',
    marginTop: 2,
  },
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
    gap: SPACING.sm,
  },
  removeBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  removeBannerText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  watchAdButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  watchAdGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    minHeight: Platform.OS === 'ios' ? 56 : 48,
    gap: SPACING.sm,
  },
  watchAdText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    paddingHorizontal: SPACING.sm,
  },
});

export default ShopScreen;
