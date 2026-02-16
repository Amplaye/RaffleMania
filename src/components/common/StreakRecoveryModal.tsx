import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SvgUri} from 'react-native-svg';
import {useThemeColors} from '../../hooks/useThemeColors';
import {SPACING, FONT_WEIGHT, FONT_FAMILY, RADIUS, COLORS} from '../../utils/constants';

const CREDITS_ICON_URI = 'https://www.rafflemania.it/wp-content/uploads/2026/02/ICONA-CREDITI-svg.svg';

interface StreakRecoveryModalProps {
  visible: boolean;
  currentStreak: number;
  missedDays: number;
  userCredits: number;
  onRecover: () => void;
  onSkip: () => void;
  onGoToProfile?: () => void;
}

// Generate day rewards for the current week based on streak (same as StreakModal)
const getDayRewards = (currentStreak: number, _missedDays: number) => {
  // Calculate which week we're in based on streak before missing days
  const effectiveStreak = currentStreak;
  const currentWeek = Math.floor((effectiveStreak - 1) / 7);
  const startDay = currentWeek * 7 + 1;

  return [
    {day: startDay, xp: 5, credits: 0},
    {day: startDay + 1, xp: 5, credits: 0},
    {day: startDay + 2, xp: 5, credits: 0},
    {day: startDay + 3, xp: 5, credits: 0},
    {day: startDay + 4, xp: 5, credits: 0},
    {day: startDay + 5, xp: 5, credits: 0},
    {day: startDay + 6, xp: 10, credits: 1},
  ];
};

export const StreakRecoveryModal: React.FC<StreakRecoveryModalProps> = ({
  visible,
  currentStreak,
  missedDays,
  onGoToProfile,
}) => {
  const {isDark} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Get rewards for current week
  const dayRewards = getDayRewards(currentStreak > 0 ? currentStreak : 1, missedDays);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);

      // Main modal animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Calculate which days are completed, missed, or pending
  // Example: currentStreak = 1, missedDays = 1, today = Day 3
  // Day 1: completed (dayNumber <= currentStreak)
  // Day 2: missed (dayNumber > currentStreak && dayNumber <= currentStreak + missedDays)
  // Day 3: current/today (dayNumber === currentStreak + missedDays + 1)
  // Day 4+: pending (future days)
  const todayDay = currentStreak + missedDays + 1;

  const getDisplayDayStatus = (dayNumber: number) => {
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
  };

  return (
    <Animated.View
      style={[
        styles.absoluteContainer,
        {
          opacity: opacityAnim,
          transform: [{translateX: visible ? 0 : -10000}],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{scale: scaleAnim}],
                }
              ]}>

              {/* Background */}
              <LinearGradient
                colors={isDark
                  ? ['#1a1a1a', '#2d1810', '#1a1a1a']
                  : ['#FFF5E6', '#FFECD2', '#FFE0BD']
                }
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradientBg}
              />

              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, {color: isDark ? '#FF6B6B' : '#E53935'}]}>
                  Streak Interrotta!
                </Text>
                <Text style={[styles.headerSubtitle, {color: isDark ? '#B3B3B3' : '#666666'}]}>
                  Hai perso {missedDays} giorn{missedDays === 1 ? 'o' : 'i'} di login
                </Text>
              </View>

              {/* Days 1-4 Row (same as StreakModal) */}
              <View style={styles.daysRow}>
                {dayRewards.slice(0, 4).map((dayReward) => {
                  const status = getDisplayDayStatus(dayReward.day);
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
                  const status = getDisplayDayStatus(dayReward.day);
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
                                  <SvgUri uri={CREDITS_ICON_URI} width={12} height={12} />
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

              {/* Recover Button */}
              <View style={styles.buttonsContainer}>
                {onGoToProfile && (
                  <TouchableOpacity
                    style={styles.recoverButton}
                    onPress={() => {
                      Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                      }).start(() => {
                        onGoToProfile();
                      });
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, '#FF8500']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.recoverButtonGradient}
                    >
                      <Ionicons name="refresh" size={20} color="#fff" />
                      <Text style={styles.recoverButtonText}>RECUPERA STREAK</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: '#E53935',
    overflow: 'hidden',
    paddingBottom: SPACING.lg,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
  },
  // Day boxes - same as StreakModal
  daysRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
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
  buttonsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  recoverButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  recoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minHeight: Platform.OS === 'ios' ? 56 : 50,
    gap: 8,
  },
  recoverButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    letterSpacing: 2,
  },
});

export default StreakRecoveryModal;
