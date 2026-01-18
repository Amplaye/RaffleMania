import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useThemeColors} from '../../hooks/useThemeColors';
import {SPACING, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, RADIUS} from '../../utils/constants';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface StreakReward {
  xp: number;
  credits: number;
  isWeeklyBonus: boolean;
  isMilestone: boolean;
}

interface StreakModalProps {
  visible: boolean;
  currentStreak: number;
  reward: StreakReward | null;
  nextMilestone: number;
  daysUntilWeeklyBonus: number;
  onClose: () => void;
}

// Generate day rewards for the current week based on streak
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

export const StreakModal: React.FC<StreakModalProps> = ({
  visible,
  currentStreak,
  onClose,
}) => {
  const {colors, isDark} = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const dayAnims = useRef([...Array(7)].map(() => new Animated.Value(0))).current;

  // Get rewards for current week
  const dayRewards = getDayRewards(currentStreak);

  // Current week number (1-indexed for display)
  const currentWeek = Math.floor((currentStreak - 1) / 7) + 1;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
      dayAnims.forEach(anim => anim.setValue(0));

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

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Staggered day cards animation
      dayAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          delay: index * 80,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{scale: scaleAnim}],
            }
          ]}>

          {/* App gradient background */}
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
            <Text style={[styles.headerTitle, {color: isDark ? '#FFD700' : '#FF6B00'}]}>Daily Login</Text>
          </View>

          {/* Days 1-4 Row */}
          <View style={styles.daysRow}>
            {dayRewards.slice(0, 4).map((dayReward, index) => {
              const isCompleted = dayReward.day < currentStreak;
              const isToday = dayReward.day === currentStreak;

              return (
                <Animated.View
                  key={dayReward.day}
                  style={[
                    styles.dayBox,
                    {
                      transform: [{scale: dayAnims[index]}],
                    },
                  ]}>
                  <LinearGradient
                    colors={
                      isCompleted
                        ? ['#00B894', '#00a884']
                        : isToday
                          ? ['#FF6B00', '#E55A00']
                          : isDark
                            ? ['#2A2A2A', '#1E1E1E']
                            : ['#FFFFFF', '#F8F8F8']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={[
                      styles.dayBoxGradient,
                      isToday && styles.dayBoxTodayBorder,
                    ]}
                  >
                    <Text style={[
                      styles.dayLabel,
                      (isCompleted || isToday) && styles.dayLabelLight,
                      !isCompleted && !isToday && {color: isDark ? '#808080' : '#666666'},
                    ]}>
                      Day {dayReward.day}
                    </Text>
                    {isCompleted && (
                      <View style={styles.iconContainer}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      </View>
                    )}
                    <Text style={[
                      styles.rewardXP,
                      (isCompleted || isToday) && styles.rewardXPLight,
                      !isCompleted && !isToday && {color: isDark ? '#808080' : '#666666'},
                      isCompleted && styles.rewardXPCompleted,
                    ]}>
                      +{dayReward.xp} XP
                    </Text>
                  </LinearGradient>
                  {isToday && (
                    <Animated.View
                      style={[styles.glowBorder, {opacity: glowOpacity, borderColor: '#FF6B00'}]}
                    />
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Days 5-6 and Day 7 Row */}
          <View style={styles.daysRowBottom}>
            {/* Days 5-6 */}
            <View style={styles.days56Container}>
              {dayRewards.slice(4, 6).map((dayReward, idx) => {
                const index = idx + 4;
                const isCompleted = dayReward.day < currentStreak;
                const isToday = dayReward.day === currentStreak;

                return (
                  <Animated.View
                    key={dayReward.day}
                    style={[
                      styles.dayBox,
                      {
                        transform: [{scale: dayAnims[index]}],
                      },
                    ]}>
                    <LinearGradient
                      colors={
                        isCompleted
                          ? ['#00B894', '#00a884']
                          : isToday
                            ? ['#FF6B00', '#E55A00']
                            : isDark
                              ? ['#2A2A2A', '#1E1E1E']
                              : ['#FFFFFF', '#F8F8F8']
                      }
                      start={{x: 0, y: 0}}
                      end={{x: 0, y: 1}}
                      style={[
                        styles.dayBoxGradient,
                        isToday && styles.dayBoxTodayBorder,
                      ]}
                    >
                      <Text style={[
                        styles.dayLabel,
                        (isCompleted || isToday) && styles.dayLabelLight,
                        !isCompleted && !isToday && {color: isDark ? '#808080' : '#666666'},
                      ]}>
                        Day {dayReward.day}
                      </Text>
                      {isCompleted && (
                        <View style={styles.iconContainer}>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                        </View>
                      )}
                      <Text style={[
                        styles.rewardXP,
                        (isCompleted || isToday) && styles.rewardXPLight,
                        !isCompleted && !isToday && {color: isDark ? '#808080' : '#666666'},
                        isCompleted && styles.rewardXPCompleted,
                      ]}>
                        +{dayReward.xp} XP
                      </Text>
                    </LinearGradient>
                    {isToday && (
                      <Animated.View
                        style={[styles.glowBorder, {opacity: glowOpacity, borderColor: '#FF6B00'}]}
                      />
                    )}
                  </Animated.View>
                );
              })}
            </View>

            {/* Day 7 - Special Box */}
            {(() => {
              const dayReward = dayRewards[6];
              const isCompleted = dayReward.day < currentStreak;
              const isToday = dayReward.day === currentStreak;

              return (
                <Animated.View
                  style={[
                    styles.dayBoxSpecial,
                    {
                      transform: [{scale: dayAnims[6]}],
                    },
                  ]}>
                  <LinearGradient
                    colors={
                      isCompleted
                        ? ['#00B894', '#00a884']
                        : isToday
                          ? ['#FF6B00', '#E55A00']
                          : ['#FFB366', '#FF8533']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={[
                      styles.dayBoxGradientSpecial,
                      isToday && styles.dayBoxTodayBorder,
                    ]}
                  >
                    <Text style={styles.dayLabelLight}>
                      Day {dayReward.day}
                    </Text>
                    <View style={styles.iconContainerSpecial}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={28} color="#fff" />
                      ) : (
                        <Ionicons name="gift" size={32} color="#fff" />
                      )}
                    </View>
                    <Text style={[
                      styles.rewardXPSpecial,
                      isCompleted && styles.rewardXPCompleted,
                    ]}>
                      +{dayReward.xp} XP
                    </Text>
                    {!isCompleted && (
                      <View style={styles.bonusTag}>
                        <Ionicons name="logo-usd" size={12} color="#fff" />
                        <Text style={styles.bonusText}>+1</Text>
                      </View>
                    )}
                  </LinearGradient>
                  {isToday && (
                    <Animated.View
                      style={[styles.glowBorderSpecial, {opacity: glowOpacity, borderColor: '#FF6B00'}]}
                    />
                  )}
                </Animated.View>
              );
            })()}
          </View>

          {/* Claim Button */}
          <TouchableOpacity
            style={styles.claimButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF8C00', '#FFB366']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.claimButtonGradient}
            >
              <Text style={styles.claimButtonText}>RISCUOTI</Text>
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textShadowColor: 'rgba(255, 107, 0, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
  },
  daysRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  daysRowBottom: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  days56Container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dayBox: {
    width: 60,
    height: 55,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  dayBoxSpecial: {
    width: 100,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  dayBoxGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 2,
    borderRadius: 10,
    gap: 4,
  },
  dayBoxGradientSpecial: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  dayBoxTodayBorder: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  dayLabelLight: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSpecial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardXP: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  rewardXPSpecial: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  rewardXPLight: {
    color: '#fff',
  },
  rewardXPCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bonusText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 12,
    borderWidth: 2,
  },
  glowBorderSpecial: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
  },
  claimButton: {
    margin: SPACING.lg,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  claimButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  claimButtonText: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
    letterSpacing: 2,
  },
});

export default StreakModal;
