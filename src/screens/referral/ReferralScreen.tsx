import React, {useRef, useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  Animated,
  Clipboard,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useAuthStore, useReferralStore, REFERRAL_REWARDS} from '../../store';
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

// Step Component for "Come funziona"
const StepItem: React.FC<{
  number: number;
  icon: string;
  title: string;
  description: string;
  isLast?: boolean;
  colors: any;
}> = ({number, icon, title, description, isLast, colors}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: number * 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: number * 150,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepNumberCircle, {backgroundColor: COLORS.primary}]}>
          <Text style={styles.stepNumber}>{number}</Text>
        </View>
        {!isLast && <View style={[styles.stepLine, {backgroundColor: `${COLORS.primary}30`}]} />}
      </View>
      <View style={[styles.stepContent, {backgroundColor: colors.card}]}>
        <View style={[styles.stepIconContainer, {backgroundColor: `${COLORS.primary}15`}]}>
          <Ionicons name={icon} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.stepTextContainer}>
          <Text style={[styles.stepTitle, {color: colors.text}]}>{title}</Text>
          <Text style={[styles.stepDescription, {color: colors.textMuted}]}>{description}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Invited Friend Card
const InvitedFriendCard: React.FC<{
  name: string;
  daysActive: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  colors: any;
}> = ({name, daysActive, isCompleted, rewardClaimed: _rewardClaimed, colors}) => {
  const progress = Math.min(daysActive / REFERRAL_REWARDS.DAYS_REQUIRED, 1);

  return (
    <View style={[styles.friendCard, {backgroundColor: colors.card}]}>
      <View style={styles.friendLeft}>
        <View style={[styles.friendAvatar, {backgroundColor: `${COLORS.primary}20`}]}>
          <Text style={styles.friendAvatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, {color: colors.text}]}>{name}</Text>
          <Text style={[styles.friendStatus, {color: colors.textMuted}]}>
            {isCompleted ? 'Completato!' : `${daysActive}/${REFERRAL_REWARDS.DAYS_REQUIRED} giorni attivi`}
          </Text>
        </View>
      </View>
      <View style={styles.friendRight}>
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completedText}>+{REFERRAL_REWARDS.REFERRER_CREDITS}</Text>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, {backgroundColor: `${COLORS.primary}20`}]}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${progress * 100}%`, backgroundColor: COLORS.primary},
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// My Progress Card (when I was referred by someone)
const MyProgressCard: React.FC<{
  referrerName: string;
  daysActive: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  colors: any;
}> = ({referrerName, daysActive, isCompleted, rewardClaimed, colors}) => {
  const progress = Math.min(daysActive / REFERRAL_REWARDS.DAYS_REQUIRED, 1);

  return (
    <View style={[styles.myProgressCard, {backgroundColor: colors.card, borderColor: COLORS.primary}]}>
      <View style={styles.myProgressHeader}>
        <Ionicons name="gift" size={24} color={COLORS.primary} />
        <Text style={[styles.myProgressTitle, {color: colors.text}]}>Il tuo bonus referral</Text>
      </View>
      <Text style={[styles.myProgressSubtitle, {color: colors.textMuted}]}>
        Invitato da <Text style={{color: COLORS.primary, fontWeight: '600'}}>{referrerName}</Text>
      </Text>

      {isCompleted ? (
        <View style={styles.myProgressCompleted}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          <Text style={[styles.myProgressCompletedText, {color: '#4CAF50'}]}>
            {rewardClaimed ? 'Bonus riscosso!' : `Hai guadagnato ${REFERRAL_REWARDS.REFERRED_CREDITS} crediti!`}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.myProgressBarContainer}>
            <View style={[styles.myProgressBar, {backgroundColor: `${COLORS.primary}20`}]}>
              <View
                style={[
                  styles.myProgressFill,
                  {width: `${progress * 100}%`, backgroundColor: COLORS.primary},
                ]}
              />
            </View>
            <Text style={[styles.myProgressText, {color: colors.textSecondary}]}>
              {daysActive}/{REFERRAL_REWARDS.DAYS_REQUIRED} giorni
            </Text>
          </View>
          <Text style={[styles.myProgressHint, {color: colors.textMuted}]}>
            Resta attivo per {REFERRAL_REWARDS.DAYS_REQUIRED - daysActive} giorni per ricevere {REFERRAL_REWARDS.REFERRED_CREDITS} crediti!
          </Text>
        </>
      )}
    </View>
  );
};

export const ReferralScreen: React.FC<ReferralScreenProps> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const {user} = useAuthStore();
  const {
    referredUsers,
    referrer,
    isLoading,
    getTotalCreditsEarned,
    checkAndClaimRewards,
    updateDailyActivity,
    fetchReferrals,
    simulateNewReferral,
    simulateDaysActive,
  } = useReferralStore();

  const referralCode = user?.referralCode || 'RAFFLE2024';

  // Fetch referrals, update daily activity and check for rewards on mount
  useEffect(() => {
    const initReferrals = async () => {
      // First fetch from API to get latest data
      await fetchReferrals();

      // Then update activity
      await updateDailyActivity();

      // Check and claim rewards
      const rewards = await checkAndClaimRewards();
      if (rewards.referrerReward > 0 || rewards.referredReward > 0) {
        const total = rewards.referrerReward + rewards.referredReward;
        Alert.alert(
          'Congratulazioni!',
          `Hai guadagnato ${total} crediti bonus dai referral!`,
          [{text: 'Fantastico!'}]
        );
      }
    };

    initReferrals();
  }, [fetchReferrals, updateDailyActivity, checkAndClaimRewards]);

  const totalCreditsEarned = getTotalCreditsEarned();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReferrals();
    setRefreshing(false);
  }, [fetchReferrals]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Unisciti a RaffleMania e vinci premi incredibili! \n\nUsa il mio codice: ${referralCode}\n\nSe resti attivo per ${REFERRAL_REWARDS.DAYS_REQUIRED} giorni, entrambi riceveremo ${REFERRAL_REWARDS.REFERRER_CREDITS} crediti bonus!\n\nScarica ora: https://rafflemania.app`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Copiato!', 'Il codice e stato copiato negli appunti');
  };

  const steps = [
    {
      icon: 'share-social-outline',
      title: 'Condividi il codice',
      description: 'Invia il tuo codice personale ai tuoi amici',
    },
    {
      icon: 'person-add-outline',
      title: "L'amico si registra",
      description: 'Il tuo amico si iscrive usando il tuo codice',
    },
    {
      icon: 'calendar-outline',
      title: `${REFERRAL_REWARDS.DAYS_REQUIRED} giorni attivi`,
      description: `L'amico deve essere attivo per ${REFERRAL_REWARDS.DAYS_REQUIRED} giorni consecutivi`,
    },
    {
      icon: 'gift-outline',
      title: 'Entrambi vincete!',
      description: `Tu e il tuo amico ricevete ${REFERRAL_REWARDS.REFERRER_CREDITS} crediti ciascuno`,
    },
  ];

  return (
    <ScreenContainer scrollable={false} padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Invita Amici</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }>
        {/* Loading indicator */}
        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={[styles.loadingText, {color: colors.textMuted}]}>Caricamento...</Text>
          </View>
        )}

        {/* Hero Section - Same style as Credits Screen balanceCard */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[COLORS.primary, '#FF6B00']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.heroGradient}>
            <View style={styles.heroContentWrapper}>
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>Invita e Guadagna!</Text>
                <Text style={styles.heroAmount}>{REFERRAL_REWARDS.REFERRER_CREDITS}</Text>
                <Text style={styles.heroSubtext}>crediti per ogni amico attivo {REFERRAL_REWARDS.DAYS_REQUIRED} giorni</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* My Progress (if I was referred) */}
        {referrer && (
          <MyProgressCard
            referrerName={referrer.displayName}
            daysActive={referrer.daysActive}
            isCompleted={referrer.isCompleted}
            rewardClaimed={referrer.rewardClaimed}
            colors={colors}
          />
        )}

        {/* Referral Code Section */}
        <View style={[styles.codeSection, {backgroundColor: colors.card}]}>
          <Text style={[styles.codeSectionTitle, {color: colors.textMuted}]}>
            Il tuo codice personale
          </Text>
          <View style={styles.codeRow}>
            <View style={[styles.codeBox, {backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5'}]}>
              <Text style={[styles.codeText, {color: colors.text}]}>{referralCode}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyButton, {backgroundColor: `${COLORS.primary}15`}]}
              onPress={handleCopyCode}
              activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {/* Share Button - Same style as "Guarda Ads" button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}>
            <Ionicons name="share-social" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Condividi con gli amici</Text>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Come funziona</Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <StepItem
              key={index}
              number={index + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              isLast={index === steps.length - 1}
              colors={colors}
            />
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <Ionicons name="people-outline" size={28} color={COLORS.primary} />
            <Text style={[styles.statValue, {color: colors.text}]}>{referredUsers.length}</Text>
            <Text style={[styles.statLabel, {color: colors.textMuted}]}>Amici invitati</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <Ionicons name="diamond-outline" size={28} color={COLORS.primary} />
            <Text style={[styles.statValue, {color: colors.text}]}>{totalCreditsEarned}</Text>
            <Text style={[styles.statLabel, {color: colors.textMuted}]}>Crediti guadagnati</Text>
          </View>
        </View>

        {/* Invited Friends */}
        {referredUsers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>I tuoi amici</Text>
            <View style={styles.friendsList}>
              {referredUsers.map((friend, index) => (
                <InvitedFriendCard
                  key={friend.id || index}
                  name={friend.displayName}
                  daysActive={friend.daysActive}
                  isCompleted={friend.isCompleted}
                  rewardClaimed={friend.rewardClaimed}
                  colors={colors}
                />
              ))}
            </View>
          </>
        )}

        {/* Empty State */}
        {referredUsers.length === 0 && (
          <View style={[styles.emptyState, {backgroundColor: colors.card}]}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyStateTitle, {color: colors.text}]}>
              Nessun amico invitato
            </Text>
            <Text style={[styles.emptyStateText, {color: colors.textMuted}]}>
              Condividi il tuo codice e inizia a guadagnare crediti!
            </Text>
          </View>
        )}

        {/* Debug/Test Section - only in development */}
        {__DEV__ && (
          <View style={[styles.debugSection, {backgroundColor: colors.card}]}>
            <Text style={[styles.debugTitle, {color: colors.textMuted}]}>Test Referral</Text>
            <View style={styles.debugButtons}>
              <TouchableOpacity
                style={[styles.debugButton, {backgroundColor: `${COLORS.primary}20`}]}
                onPress={() => {
                  const names = ['Marco', 'Giulia', 'Luca', 'Anna', 'Pietro', 'Sofia'];
                  const randomName = names[Math.floor(Math.random() * names.length)];
                  simulateNewReferral(randomName);
                  Alert.alert('Test', `Simulato nuovo referral: ${randomName}`);
                }}>
                <Ionicons name="person-add" size={18} color={COLORS.primary} />
                <Text style={[styles.debugButtonText, {color: COLORS.primary}]}>+ Nuovo Amico</Text>
              </TouchableOpacity>
              {referredUsers.length > 0 && (
                <TouchableOpacity
                  style={[styles.debugButton, {backgroundColor: `${COLORS.primary}20`}]}
                  onPress={() => {
                    const pendingUser = referredUsers.find(u => !u.isCompleted);
                    if (pendingUser) {
                      simulateDaysActive(pendingUser.id, REFERRAL_REWARDS.DAYS_REQUIRED);
                      Alert.alert('Test', `${pendingUser.displayName} ha completato i 7 giorni!`);
                    } else {
                      Alert.alert('Test', 'Tutti gli amici hanno gia completato');
                    }
                  }}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  <Text style={[styles.debugButtonText, {color: COLORS.primary}]}>Completa Amico</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{height: 100}} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
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
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  // Hero Section - Same as CreditsScreen balanceCard
  heroCard: {
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: SPACING.lg,
  },
  heroGradient: {
    borderRadius: RADIUS.xl,
  },
  heroContentWrapper: {
    padding: SPACING.xl,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroAmount: {
    fontSize: 52,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  heroSubtext: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  // My Progress Card
  myProgressCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 2,
  },
  myProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  myProgressTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  myProgressSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
  },
  myProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  myProgressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  myProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  myProgressText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    minWidth: 60,
    textAlign: 'right',
  },
  myProgressHint: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: 'italic',
  },
  myProgressCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  myProgressCompletedText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Code Section
  codeSection: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  codeSectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  codeBox: {
    flex: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  codeText: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 3,
    textAlign: 'center',
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Share Button - Same style as "Guarda Ads" button in HomeScreen
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    gap: 10,
    minHeight: 52,
  },
  shareButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Section Title
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  // Steps
  stepsContainer: {
    marginBottom: SPACING.lg,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
    textAlign: 'center',
  },
  // Friends List
  friendsList: {
    gap: SPACING.sm,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  friendAvatarText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  friendStatus: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  friendRight: {
    marginLeft: SPACING.md,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#4CAF50',
  },
  progressContainer: {
    width: 60,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
  // Debug Section
  debugSection: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  debugTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  debugButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  debugButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default ReferralScreen;
