import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useStreakStore, STREAK_REWARDS} from '../../store/useStreakStore';
import {useAuthStore} from '../../store/useAuthStore';
import {useLevelStore} from '../../store/useLevelStore';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
  COLORS,
} from '../../utils/constants';

interface StreakScreenProps {
  navigation: any;
}

// Generate day rewards for the current week based on streak (same as StreakModal)
const getDayRewards = (currentStreak: number) => {
  // Calculate which week we're in (0-indexed)
  const currentWeek = Math.floor((currentStreak - 1) / 7);
  const startDay = currentWeek * 7 + 1;

  return [
    {day: startDay, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 1, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 2, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 3, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 4, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 5, xp: 5, credits: 0, icon: 'flash'},
    {day: startDay + 6, xp: 10, credits: 1, icon: 'gift'},
  ];
};

export const StreakScreen: React.FC<StreakScreenProps> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const {
    currentStreak,
    streakBroken,
    missedDays,
  } = useStreakStore();
  const user = useAuthStore(state => state.user);

  const [isRecovering, setIsRecovering] = useState(false);

  const recoveryCostPerDay = STREAK_REWARDS.RECOVERY_COST_PER_DAY;
  const userCredits = user?.credits ?? 0;
  const canAffordRecovery = userCredits >= recoveryCostPerDay;

  // Get rewards for current week (same as StreakModal)
  const dayRewards = getDayRewards(currentStreak > 0 ? currentStreak : 1);

  // Recupera un singolo giorno - incrementa streak e dà i premi del giorno
  const handleRecoverOneDay = async () => {
    if (!canAffordRecovery) {
      return;
    }

    setIsRecovering(true);

    try {
      const authStore = useAuthStore.getState();
      const levelStore = useLevelStore.getState();
      const newStreak = currentStreak + 1;
      const newMissedDays = missedDays - 1;

      // Calculate XP reward for the recovered day (using constants)
      const dayInWeek = ((newStreak - 1) % 7) + 1; // 1-7
      const isDay7 = dayInWeek === 7;
      const xpReward = isDay7 ? STREAK_REWARDS.DAY_7_XP : STREAK_REWARDS.DAILY_XP;
      const creditsReward = isDay7 ? STREAK_REWARDS.DAY_7_CREDITS : 0;

      // Current credits
      const currentCredits = authStore.user?.credits || 0;

      // Deduct recovery cost and add credit rewards
      const newCredits = currentCredits - recoveryCostPerDay + creditsReward;

      console.log('[StreakScreen] Recovery - Day:', newStreak, 'XP reward:', xpReward, 'Credits cost:', recoveryCostPerDay);
      console.log('[StreakScreen] Before: Credits=', currentCredits, 'LevelStore totalXP=', levelStore.totalXP);

      // Award XP using level store (same as tickets)
      if (xpReward > 0) {
        const levelUpResult = levelStore.addXP(xpReward);
        console.log('[StreakScreen] Added XP to level store. New totalXP=', levelStore.totalXP);

        // Handle level up credit reward
        if (levelUpResult && levelUpResult.creditReward > 0) {
          authStore.updateUser({
            credits: newCredits + levelUpResult.creditReward,
          });
          console.log('[StreakScreen] Level up! Added', levelUpResult.creditReward, 'credits');
        } else {
          authStore.updateUser({
            credits: newCredits,
          });
        }
      } else {
        authStore.updateUser({
          credits: newCredits,
        });
      }

      console.log('[StreakScreen] After: Credits=', newCredits);

      // Update streak state - increment currentStreak to make the day green
      useStreakStore.setState({
        currentStreak: newStreak,
        missedDays: newMissedDays,
        streakBroken: newMissedDays > 0, // Still broken if more days to recover
      });

      if (newMissedDays <= 0) {
        // All days recovered - update lastLoginDate so today can be claimed
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;

        useStreakStore.setState({
          lastLoginDate: yesterdayStr,
          streakBroken: false,
          hasClaimedToday: false,
        });
      }

      // NOTE: Do NOT call refreshUserData() here as it would overwrite the credit/XP changes
    } catch (error) {
      console.error('Errore nel recupero del giorno:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  // Calcola il giorno nella settimana corrente (1-7)
  const weekNumber = currentStreak > 0 ? Math.ceil(currentStreak / 7) : 0;

  // Calculate today's day number (same logic as StreakRecoveryModal)
  // If streak is broken: today = currentStreak + missedDays + 1
  // If streak is active: today = currentStreak
  const todayDay = streakBroken && missedDays > 0
    ? currentStreak + missedDays + 1
    : currentStreak;

  // Get day status (same logic as StreakRecoveryModal)
  const getDayStatus = (dayNumber: number) => {
    if (streakBroken && missedDays > 0) {
      // Days up to current streak are completed
      if (dayNumber <= currentStreak) {
        return 'completed';
      }
      // Days between current streak and today are missed
      if (dayNumber > currentStreak && dayNumber < todayDay) {
        return 'missed';
      }
      // Today's day
      if (dayNumber === todayDay) {
        return 'current';
      }
      // Future days
      return 'pending';
    } else {
      // Normal streak (not broken) - same logic as StreakModal
      // Days up to and including currentStreak are completed (green)
      if (dayNumber <= currentStreak) {
        return 'completed';
      }
      return 'pending';
    }
  };

  // Handle button press - go to Shop if no credits, otherwise recover
  const handleRecoverButtonPress = () => {
    if (!canAffordRecovery) {
      navigation.navigate('MainTabs', {screen: 'Shop'});
    } else {
      handleRecoverOneDay();
    }
  };

  return (
    <ScreenContainer>
      {/* Header con freccia indietro */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs', {screen: 'Profile'})}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Login Streak</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Weekly Progress - Same design as StreakModal */}
        <Card style={[styles.weekCard, styles.weekCardShadow]}>
          <View style={styles.weekHeader}>
            <Text style={[styles.weekTitle, {color: isDark ? '#FFD700' : '#FF6B00'}]}>Daily Login</Text>
            <Text style={[styles.weekSubtitle, {color: colors.textMuted}]}>
              Settimana {weekNumber || 1}
            </Text>
          </View>

          {/* Days 1-4 Row (same as StreakModal) */}
          <View style={styles.daysRow}>
            {dayRewards.slice(0, 4).map((dayReward) => {
              const status = getDayStatus(dayReward.day);
              const isCompleted = status === 'completed';
              const isMissed = status === 'missed';

              return (
                <View key={dayReward.day} style={styles.dayBox}>
                  <LinearGradient
                    colors={
                      isCompleted
                        ? ['#00B894', '#00a884']
                        : isMissed
                          ? ['#E53935', '#C62828']
                          : isDark
                            ? ['#2A2A2A', '#1E1E1E']
                            : ['#FFFFFF', '#F8F8F8']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={styles.dayBoxGradient}
                  >
                    <View style={styles.dayContentWrapper}>
                      <Text style={[
                        styles.dayLabel,
                        (isCompleted || isMissed) && styles.dayLabelLight,
                        !isCompleted && !isMissed && {color: isDark ? '#808080' : '#666666'},
                      ]}>
                        Day {dayReward.day}
                      </Text>
                      {isCompleted ? (
                        <View style={styles.checkContainer}>
                          <Ionicons name="checkmark" size={22} color="#fff" />
                        </View>
                      ) : isMissed ? (
                        <View style={styles.checkContainer}>
                          <Ionicons name="close" size={22} color="#fff" />
                        </View>
                      ) : (
                        <View style={styles.rewardContainer}>
                          <Text style={[
                            styles.rewardXP,
                            {color: isDark ? '#808080' : '#666666'},
                          ]}>
                            +{dayReward.xp} XP
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {/* Days 5-7 Row (same as StreakModal) */}
          <View style={styles.daysRow}>
            {dayRewards.slice(4, 7).map((dayReward, idx) => {
              const status = getDayStatus(dayReward.day);
              const isCompleted = status === 'completed';
              const isMissed = status === 'missed';
              const isDay7 = idx === 2;

              return (
                <View key={dayReward.day} style={styles.dayBox}>
                  <LinearGradient
                    colors={
                      isCompleted
                        ? ['#00B894', '#00a884']
                        : isMissed
                          ? ['#E53935', '#C62828']
                          : isDay7
                            ? ['#FFB366', '#FF8533']
                            : isDark
                              ? ['#2A2A2A', '#1E1E1E']
                              : ['#FFFFFF', '#F8F8F8']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={styles.dayBoxGradient}
                  >
                    <View style={styles.dayContentWrapper}>
                      <Text style={[
                        styles.dayLabel,
                        (isCompleted || isMissed || isDay7) && styles.dayLabelLight,
                        !isCompleted && !isMissed && !isDay7 && {color: isDark ? '#808080' : '#666666'},
                      ]}>
                        Day {dayReward.day}
                      </Text>
                      {isCompleted ? (
                        <View style={styles.checkContainer}>
                          <Ionicons name="checkmark" size={22} color="#fff" />
                        </View>
                      ) : isMissed ? (
                        <View style={styles.checkContainer}>
                          <Ionicons name="close" size={22} color="#fff" />
                        </View>
                      ) : (
                        <View style={styles.rewardContainer}>
                          <Text style={[
                            styles.rewardXP,
                            isDay7 && styles.rewardXPLight,
                            !isDay7 && {color: isDark ? '#808080' : '#666666'},
                          ]}>
                            +{dayReward.xp} XP
                          </Text>
                          {isDay7 && dayReward.credits > 0 && !isMissed && (
                            <View style={styles.bonusTag}>
                              <Ionicons name="logo-usd" size={10} color="#fff" />
                              <Text style={styles.bonusText}>+{dayReward.credits}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Streak Broken - Recovery Section */}
        {streakBroken && missedDays > 0 && (
          <Card style={[styles.recoveryCard, {borderColor: '#E53935'}]}>
            <View style={styles.recoveryHeader}>
              <Ionicons name="warning" size={24} color="#E53935" />
              <Text style={[styles.recoveryTitle, {color: '#E53935'}]}>
                {missedDays} giorn{missedDays === 1 ? 'o' : 'i'} pers{missedDays === 1 ? 'o' : 'i'}!
              </Text>
            </View>

            <Text style={[styles.recoveryDescription, {color: colors.textSecondary}]}>
              Recupera i giorni persi per mantenere la tua streak di {currentStreak} giorni.
            </Text>

            {/* Missed Days Visual */}
            <View style={styles.missedDaysContainer}>
              {Array.from({length: Math.min(missedDays, 7)}).map((_, index) => (
                <View
                  key={index}
                  style={styles.missedDayBox}
                >
                  <Ionicons name="close-circle" size={20} color="#E53935" />
                </View>
              ))}
              {missedDays > 7 && (
                <View style={styles.missedDayBox}>
                  <Text style={styles.missedDayPlus}>+{missedDays - 7}</Text>
                </View>
              )}
            </View>

            {/* Recovery Cost Info */}
            <View style={[styles.costInfo, {backgroundColor: colors.background}]}>
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, {color: colors.textSecondary}]}>
                  Costo per giorno:
                </Text>
                <Text style={[styles.costAmount, {color: COLORS.primary}]}>
                  {recoveryCostPerDay} crediti
                </Text>
              </View>
              <View style={[styles.balanceRow, {borderTopColor: colors.border}]}>
                <Text style={[styles.costLabel, {color: colors.textSecondary}]}>
                  I tuoi crediti:
                </Text>
                <Text style={[styles.balanceAmount, {color: canAffordRecovery ? '#00B894' : '#E53935'}]}>
                  {userCredits}
                </Text>
              </View>
            </View>

            {/* Recover Button */}
            <TouchableOpacity
              style={styles.recoverButton}
              onPress={handleRecoverButtonPress}
              disabled={isRecovering}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canAffordRecovery ? ['#00B894', '#00a884'] : [COLORS.primary, '#FF8500']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.recoverButtonGradient}
              >
                <Ionicons name={canAffordRecovery ? 'refresh' : 'cart'} size={20} color="#fff" />
                <Text style={styles.recoverButtonText}>
                  {isRecovering
                    ? 'RECUPERO...'
                    : canAffordRecovery
                      ? `RECUPERA 1 GIORNO (-${recoveryCostPerDay} crediti)`
                      : 'VAI ALLO SHOP'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>
        )}

        {/* Streak Active Info */}
        {!streakBroken && currentStreak > 0 && (
          <Card style={[styles.activeCard, {borderColor: '#00B894'}]}>
            <View style={styles.activeRow}>
              <Ionicons name="checkmark-circle" size={24} color="#00B894" />
              <Text style={[styles.activeText, {color: '#00B894'}]}>
                La tua streak è attiva! Continua così!
              </Text>
            </View>
          </Card>
        )}

        {/* Rewards Info */}
        <Card style={styles.rewardsCard}>
          <Text style={[styles.rewardsTitle, {color: colors.text}]}>Premi Streak</Text>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, {backgroundColor: 'rgba(255,107,0,0.1)'}]}>
              <Ionicons name="gift" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={[styles.rewardName, {color: colors.text}]}>Bonus Settimana 1</Text>
              <Text style={[styles.rewardDesc, {color: colors.textMuted}]}>
                +{STREAK_REWARDS.DAY_7_CREDITS + STREAK_REWARDS.WEEK_1_CREDITS} crediti al giorno 7
              </Text>
            </View>
          </View>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, {backgroundColor: 'rgba(255,107,0,0.1)'}]}>
              <Ionicons name="gift" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={[styles.rewardName, {color: colors.text}]}>Bonus Settimana 2</Text>
              <Text style={[styles.rewardDesc, {color: colors.textMuted}]}>
                +{STREAK_REWARDS.DAY_7_CREDITS + STREAK_REWARDS.WEEK_2_CREDITS} crediti al giorno 14
              </Text>
            </View>
          </View>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, {backgroundColor: 'rgba(255,107,0,0.1)'}]}>
              <Ionicons name="gift" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={[styles.rewardName, {color: colors.text}]}>Bonus Settimana 3</Text>
              <Text style={[styles.rewardDesc, {color: colors.textMuted}]}>
                +{STREAK_REWARDS.DAY_7_CREDITS + STREAK_REWARDS.WEEK_3_CREDITS} crediti al giorno 21
              </Text>
            </View>
          </View>
          <View style={styles.rewardRow}>
            <View style={[styles.rewardIcon, {backgroundColor: 'rgba(0,184,148,0.1)'}]}>
              <Ionicons name="trophy" size={20} color="#00B894" />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={[styles.rewardName, {color: colors.text}]}>Bonus Settimana 4</Text>
              <Text style={[styles.rewardDesc, {color: colors.textMuted}]}>
                +{STREAK_REWARDS.DAY_7_CREDITS + STREAK_REWARDS.WEEK_4_CREDITS} crediti al giorno 28
              </Text>
            </View>
          </View>
        </Card>

        <View style={{height: 100}} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
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
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSpacer: {
    width: 40,
  },
  weekCard: {
    marginBottom: SPACING.md,
  },
  weekCardShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weekTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  weekSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  // Day boxes - same as StreakModal
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayBoxGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayContentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: 2,
    includeFontPadding: false,
  },
  dayLabelLight: {
    color: '#fff',
  },
  checkContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardXP: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  rewardXPLight: {
    color: '#fff',
  },
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
  },
  bonusText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    includeFontPadding: false,
  },
  recoveryCard: {
    marginBottom: SPACING.md,
    borderWidth: 2,
  },
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  recoveryTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  recoveryDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  missedDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  missedDayBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E53935',
  },
  missedDayPlus: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#E53935',
  },
  costInfo: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  costLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  costAmount: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  balanceAmount: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  recoverButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  recoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 56 : 50,
    gap: 8,
  },
  recoverButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeCard: {
    marginBottom: SPACING.md,
    borderWidth: 2,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rewardsCard: {
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  rewardsTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rewardDesc: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
});

export default StreakScreen;
