import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useAuthStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface ReferralScreenProps {
  navigation: any;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({navigation}) => {
  const {colors, neon} = useThemeColors();
  const {user} = useAuthStore();
  const referralCode = user?.referralCode || 'N/A';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Unisciti a RaffleMania e vinci fantastici premi! Usa il mio codice ${referralCode} per ottenere un bonus. Scarica ora!`,
      });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile condividere il codice.');
    }
  };

  const handleCopyCode = () => {
    Alert.alert('Codice copiato!', `Il codice ${referralCode} e stato copiato negli appunti.`);
  };

  const benefits = [
    {
      icon: 'gift',
      title: 'Per te',
      description: '50 crediti per ogni amico che si registra',
    },
    {
      icon: 'people',
      title: 'Per il tuo amico',
      description: '50 crediti bonus alla registrazione',
    },
    {
      icon: 'infinite',
      title: 'Nessun limite',
      description: 'Invita quanti amici vuoi',
    },
  ];

  return (
    <ScreenContainer>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, {color: colors.text}]}>Invita Amici</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={[styles.headerCard, neon.glowStrong]}>
          <LinearGradient
            colors={[COLORS.primary, '#FF6B00']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <Ionicons name="gift" size={48} color={COLORS.white} />
            <Text style={styles.headerTitle}>Invita i tuoi amici</Text>
            <Text style={styles.headerSubtitle}>
              Condividi il tuo codice e guadagna crediti bonus!
            </Text>
          </LinearGradient>
        </View>

        {/* Referral Code */}
        <Card style={[styles.codeCard, neon.glowSubtle]}>
          <Text style={[styles.codeLabel, {color: colors.textMuted}]}>Il tuo codice referral</Text>
          <View style={styles.codeContainer}>
            <Text style={[styles.codeText, {color: colors.text}]}>{referralCode}</Text>
            <TouchableOpacity style={[styles.copyButton, {backgroundColor: `${colors.primary}15`}]} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.shareButton, neon.glow]} onPress={handleShare}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.shareButtonGradient}>
              <Ionicons name="share-social" size={20} color={COLORS.white} />
              <Text style={styles.shareButtonText}>Condividi</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Card>

        {/* Benefits */}
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Come funziona</Text>
        <Card style={styles.benefitsCard}>
          {benefits.map((benefit, index) => (
            <View
              key={index}
              style={[
                styles.benefitItem,
                index < benefits.length - 1 && [styles.benefitItemBorder, {borderBottomColor: colors.border}],
              ]}>
              <View style={[styles.benefitIconContainer, {backgroundColor: `${colors.primary}15`}]}>
                <Ionicons name={benefit.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitTitle, {color: colors.text}]}>{benefit.title}</Text>
                <Text style={[styles.benefitDescription, {color: colors.textMuted}]}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Stats */}
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Le tue statistiche</Text>
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, neon.glowSubtle]}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={[styles.statValue, {color: colors.text}]}>0</Text>
            <Text style={[styles.statLabel, {color: colors.textMuted}]}>Amici invitati</Text>
          </Card>
          <Card style={[styles.statCard, neon.glowSubtle]}>
            <Ionicons name="diamond" size={24} color={colors.primary} />
            <Text style={[styles.statValue, {color: colors.text}]}>0</Text>
            <Text style={[styles.statLabel, {color: colors.textMuted}]}>Crediti guadagnati</Text>
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
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
  screenTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  codeCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  codeLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  codeText: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: 3,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  shareButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  benefitsCard: {
    marginBottom: SPACING.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  benefitItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  benefitIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  benefitDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ReferralScreen;
