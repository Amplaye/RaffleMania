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
  Modal,
  Linking,
  ActivityIndicator,
  Image,
  TurboModuleRegistry,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedBackground, AdBanner} from '../../components/common';
import {PaymentMethodSheet} from '../../components/shop/PaymentMethodSheet';
import apiClient from '../../services/apiClient';
import {
  initIAP,
  purchaseWithIAP,
  verifyAndFinishIAP,
  createStripeIntent,
  restorePurchases,
  setupPurchaseListeners,
} from '../../services/paymentService';
import {showRewardedAd, isRewardedAdReady, preloadRewardedAd, scheduleAdReadyNotification} from '../../services/adService';
import {API_CONFIG} from '../../utils/constants';
import {useAuthStore, useCreditsStore, useTicketsStore} from '../../store';
import {useGameConfigStore, ShopPackage, DEFAULT_SHOP_PACKAGES} from '../../store/useGameConfigStore';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
// Types used inline - react-native-iap is lazy-loaded via paymentService to avoid
// fatal errors when NitroModules native binary is missing
type Purchase = {productId: string; purchaseToken?: string; transactionId?: string};
type PurchaseError = {code: string; message: string};
const ErrorCode = {UserCancelled: 'user-cancelled'} as const;

interface ShopScreenProps {
  navigation: any;
}

// Credit Package data - fallback defaults (dynamic from useGameConfigStore)
const CREDIT_PACKAGES = DEFAULT_SHOP_PACKAGES;

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
      <Image
        source={{uri: 'https://www.rafflemania.it/wp-content/uploads/2026/02/ICONA-CREDITI-senza-sfondo-Copia.png'}}
        style={styles.packageCreditIcon}
      />
      <Text style={[styles.packageCredits, {color: colors.text}]}>{package_.credits}</Text>
      <Text style={[styles.packageCreditsLabel, {color: colors.textMuted}]}>CREDITI</Text>
      <Text style={styles.packagePrice}>{package_.price.toFixed(2)}€</Text>
      <Text style={[styles.packageDiscount, !package_.discount && {opacity: 0}]}>
        {package_.discount || '-'}
      </Text>
    </TouchableOpacity>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({navigation: _navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const {addCredits} = useCreditsStore();
  const {getAdCooldownSeconds, incrementAdsWatched} = useTicketsStore();
  const shopPackages = useGameConfigStore(s => s.shopPackages);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ShopPackage | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

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

  // Setup IAP purchase listeners (ensure IAP is initialized first)
  useEffect(() => {
    let mounted = true;

    const handlePurchaseUpdate = async (purchase: Purchase) => {
      if (!mounted) return;
      console.log('[Shop] Purchase update received:', purchase.productId);
      try {
        setIsPurchasing(true);
        const result = await verifyAndFinishIAP(purchase);
        if (!mounted) return;
        if (result.success && result.creditsAwarded > 0) {
          // Refresh user data from server (credits updated server-side)
          await useAuthStore.getState().refreshUserData();
          Alert.alert('Successo!', `Hai ottenuto ${result.creditsAwarded} crediti!`);
        } else if (result.success && result.creditsAwarded === 0) {
          Alert.alert('Info', 'Questo acquisto era già stato elaborato.');
        }
      } catch (error: any) {
        console.log('[Shop] Purchase verification error:', error);
        if (mounted) {
          Alert.alert('Errore', 'Verifica pagamento fallita. Contatta il supporto se il problema persiste.');
        }
      } finally {
        if (mounted) {
          setIsPurchasing(false);
          setShowPaymentSheet(false);
          setSelectedPackage(null);
        }
      }
    };

    const handlePurchaseError = (error: PurchaseError) => {
      if (!mounted) return;
      console.log('[Shop] Purchase error:', error.code, error.message);
      setIsPurchasing(false);
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Errore', 'Acquisto non riuscito. Riprova.');
      }
    };

    const initAndSetupListeners = async () => {
      try {
        await initIAP();
      } catch (e) {
        console.log('[Shop] IAP init failed (non-critical):', e);
      }
      if (mounted) {
        setupPurchaseListeners(handlePurchaseUpdate, handlePurchaseError);
      }
    };

    initAndSetupListeners();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRemoveBanner = () => {
    Alert.alert(
      'Rimuovi Banner Pubblicitari',
      'Acquistando questa opzione verrà rimossa solo la visualizzazione del banner pubblicitario in alto.\n\nPer ottenere crediti e biglietti gratuiti dovrai continuare a guardare le pubblicità video.',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Acquista (0.99€)',
          onPress: async () => {
            setIsPurchasing(true);
            try {
              // Create PaymentIntent on server for remove-ads
              const response = await apiClient.post('/payments/remove-ads');
              const {client_secret, publishable_key, already_ad_free} = response.data.data;

              if (already_ad_free) {
                useAuthStore.getState().updateUser({adFree: true});
                Alert.alert('Info', 'I banner pubblicitari sono già stati rimossi!');
                return;
              }

              // Check Stripe native module
              const stripeSdkAvailable = TurboModuleRegistry.get('StripeSdk') != null;
              if (!stripeSdkAvailable) {
                Alert.alert('Non disponibile', 'Il pagamento con carta non è disponibile su questo dispositivo.');
                return;
              }

              const stripe = require('@stripe/stripe-react-native');

              await stripe.initStripe({
                publishableKey: publishable_key,
                merchantIdentifier: 'merchant.com.rafflemania',
              });

              const {error: initError} = await stripe.initPaymentSheet({
                paymentIntentClientSecret: client_secret,
                merchantDisplayName: 'RaffleMania',
                style: 'automatic',
                returnURL: 'rafflemania://stripe-redirect',
                applePay: {merchantCountryCode: 'IT'},
                googlePay: {merchantCountryCode: 'IT', testEnv: false},
              });

              if (initError) {
                Alert.alert('Errore', initError.message || 'Impossibile inizializzare il pagamento.');
                return;
              }

              const {error} = await stripe.presentPaymentSheet();

              if (error) {
                if (error.code !== 'Canceled') {
                  Alert.alert('Errore', error.message || 'Pagamento non riuscito.');
                }
              } else {
                // Payment confirmed - ad_free will be set via webhook
                // Optimistic update + refresh after delay
                useAuthStore.getState().updateUser({adFree: true});
                setTimeout(() => {
                  useAuthStore.getState().refreshUserData();
                }, 2000);
                Alert.alert('Successo!', 'I banner pubblicitari sono stati rimossi!');
              }
            } catch (error: any) {
              console.log('[Shop] Remove-ads purchase error:', error);
              Alert.alert('Errore', 'Pagamento non riuscito. Riprova.');
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ],
    );
  };

  const handlePurchase = (package_: ShopPackage) => {
    setSelectedPackage(package_);
    setShowPaymentSheet(true);
  };

  const handleIAPPurchase = async () => {
    if (!selectedPackage) return;

    const productId = selectedPackage.iapProductId || 'credits_' + selectedPackage.credits;
    setIsPurchasing(true);
    setShowPaymentSheet(false);

    try {
      await purchaseWithIAP(productId);
      // Result will come via purchaseUpdatedListener
    } catch (error: any) {
      setIsPurchasing(false);
      if (error.message !== 'USER_CANCELLED') {
        Alert.alert('Errore', 'Impossibile avviare l\'acquisto. Riprova.');
      }
    }
  };

  const handleStripePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    setShowPaymentSheet(false);

    try {
      // Create PaymentIntent on server
      const {clientSecret, publishableKey} = await createStripeIntent(selectedPackage.id);

      // Check if Stripe native module is available before loading
      const stripeSdkAvailable = TurboModuleRegistry.get('StripeSdk') != null;
      if (!stripeSdkAvailable) {
        Alert.alert('Non disponibile', 'Il pagamento con carta non è disponibile su questo dispositivo. Ricompila l\'app nativa.');
        return;
      }

      const stripe = require('@stripe/stripe-react-native');

      // Initialize Stripe with publishable key from server
      await stripe.initStripe({
        publishableKey,
        merchantIdentifier: 'merchant.com.rafflemania',
      });

      // Use Payment Sheet for standard card input UI
      const {error: initError} = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'RaffleMania',
        style: 'automatic',
        returnURL: 'rafflemania://stripe-redirect',
        applePay: {
          merchantCountryCode: 'IT',
        },
        googlePay: {
          merchantCountryCode: 'IT',
          testEnv: false,
        },
      });

      if (initError) {
        console.log('[Shop] Stripe initPaymentSheet error:', initError);
        Alert.alert('Errore', initError.message || 'Impossibile inizializzare il pagamento.');
        return;
      }

      const {error} = await stripe.presentPaymentSheet();

      if (error) {
        console.log('[Shop] Stripe error:', error.code, error.message);
        if (error.code !== 'Canceled') {
          Alert.alert('Errore', error.message || 'Pagamento non riuscito.');
        }
      } else {
        // Payment confirmed - credits will be awarded via webhook
        // Refresh user data after a short delay to let webhook process
        setTimeout(async () => {
          await useAuthStore.getState().refreshUserData();
          Alert.alert('Successo!', `Hai ottenuto ${selectedPackage.credits} crediti!`);
        }, 2000);
      }
    } catch (error: any) {
      console.log('[Shop] Stripe purchase error:', error);
      if (error?.message?.includes('StripeSdk') || error?.message?.includes('StripeProvider')) {
        Alert.alert('Non disponibile', 'Il pagamento con carta non è ancora disponibile su questo dispositivo.');
      } else {
        Alert.alert('Errore', 'Pagamento non riuscito. Riprova.');
      }
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.restored > 0) {
        await useAuthStore.getState().refreshUserData();
        Alert.alert('Successo!', `${result.restored} acquisti ripristinati.`);
      } else {
        Alert.alert('Info', 'Nessun acquisto da ripristinare.');
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile ripristinare gli acquisti. Riprova.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWatchAd = async () => {
    if (!isRewardedAdReady()) {
      preloadRewardedAd();
      Alert.alert('Caricamento', 'La pubblicità non è ancora pronta. Riprova tra qualche secondo.');
      return;
    }

    setIsWatchingAd(true);

    const earned = await showRewardedAd();

    if (earned) {
      addCredits(1, 'other');
      incrementAdsWatched();
      scheduleAdReadyNotification();

      // Sync ad watched + credit al server
      const isGuestUser = token?.startsWith('guest_token_');
      if (!isGuestUser) {
        try {
          await apiClient.post('/users/me/reward-credit', {});
        } catch (e) {
          console.log('[Shop] Server reward-credit sync failed:', e);
        }
      }

      setShowCreditModal(true);
    }

    setIsWatchingAd(false);
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
          {/* AdMob Banner */}
          <AdBanner style={{marginHorizontal: -16}} />

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
            {shopPackages.map((pkg) => (
              <CreditPackageCard
                key={pkg.id}
                package_={pkg}
                onPress={() => handlePurchase(pkg)}
              />
            ))}
          </View>

          {/* Restore Purchases (required by Apple) */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            activeOpacity={0.7}>
            <Text style={[styles.restoreText, {color: colors.textMuted}]}>
              {isRestoring ? 'Ripristino in corso...' : 'Ripristina acquisti'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomSection}>
        {/* Remove Banner Button (hidden if already ad-free) */}
        {!user?.adFree && (
          <TouchableOpacity
            style={[styles.removeBannerButton, {backgroundColor: colors.card}]}
            onPress={handleRemoveBanner}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.removeBannerText, {color: colors.text}]}>
              RIMUOVI BANNER PUBBLICITÀ
            </Text>
          </TouchableOpacity>
        )}

        {/* Watch Ad Button */}
        <TouchableOpacity
          style={[styles.watchAdButton, cooldownSeconds > 0 && styles.buttonDisabled]}
          onPress={handleWatchAd}
          disabled={isWatchingAd || cooldownSeconds > 0}
          activeOpacity={0.8}>
          <LinearGradient
            colors={cooldownSeconds === 0 ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.watchAdGradient}>
            <Ionicons name="play-circle" size={24} color={COLORS.white} />
            {isWatchingAd ? (
              <Text style={styles.watchAdText}>CARICAMENTO...</Text>
            ) : cooldownSeconds > 0 ? (
              <Text style={styles.watchAdText}>{`ATTENDI ${formatAdCooldown(cooldownSeconds)}`}</Text>
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                <Text style={styles.watchAdText}>GUARDA ADS E RICEVI</Text>
                <Image source={{uri: 'https://www.rafflemania.it/wp-content/uploads/2026/02/ICONA-CREDITI-senza-sfondo-Copia.png'}} style={{width: 36, height: 36, marginRight: -10}} />
                <Text style={styles.watchAdText}>+1</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {/* Payment Method Sheet */}
      <PaymentMethodSheet
        visible={showPaymentSheet}
        package_={selectedPackage}
        onSelectIAP={handleIAPPurchase}
        onSelectStripe={handleStripePurchase}
        onClose={() => {
          setShowPaymentSheet(false);
          setSelectedPackage(null);
        }}
        isLoading={isPurchasing}
      />

      {/* Loading overlay during purchase */}
      {isPurchasing && (
        <View style={styles.purchaseOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.purchaseOverlayText}>Elaborazione pagamento...</Text>
        </View>
      )}

      {/* Credit Obtained Modal */}
      <Modal
        visible={showCreditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.creditModalContainer, {backgroundColor: colors.card}]}>
            <View style={styles.creditModalTitleRow}>
              <Image source={{uri: 'https://www.rafflemania.it/wp-content/uploads/2026/02/ICONA-CREDITI-senza-sfondo-Copia.png'}} style={{width: 40, height: 40}} />
              <Text style={[styles.creditModalTitle, {color: colors.text}]}>+1 Credito!</Text>
            </View>
            <Text style={[styles.creditModalSubtitle, {color: colors.textMuted}]}>
              Hai ottenuto 1 credito guardando la pubblicità
            </Text>
            <Text style={[styles.creditModalBalance, {color: COLORS.primary}]}>
              Saldo: {user?.credits ?? 0} crediti
            </Text>
            <TouchableOpacity
              style={styles.creditModalButton}
              onPress={() => setShowCreditModal(false)}
              activeOpacity={0.8}>
              <LinearGradient
                colors={[COLORS.primary, '#FF8500']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.creditModalButtonGradient}>
                <Text style={styles.creditModalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 250,
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
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  packageCreditIcon: {
    width: 40,
    height: 40,
    marginBottom: 4,
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
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    paddingHorizontal: SPACING.sm,
  },
  // Credit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  creditModalContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
  },
  creditModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  creditModalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  creditModalSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  creditModalBalance: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.lg,
  },
  creditModalButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  creditModalButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  creditModalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Restore button
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  restoreText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    textDecorationLine: 'underline',
  },
  // Purchase loading overlay
  purchaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  purchaseOverlayText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.md,
  },
});

export default ShopScreen;
