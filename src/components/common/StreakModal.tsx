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
              const isDay7 = index === 6;

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
                    {isCompleted ? (
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.rewardContainer}>
                        <Text style={[
                          styles.rewardXP,
                          (isCompleted || isToday) && styles.rewardXPLight,
                          !isCompleted && !isToday && {color: isDark ? '#808080' : '#666666'},
                        ]}>
                          +{dayReward.xp} XP
                        </Text>
                      </View>
                    )}
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

          {/* Days 5-7 Row */}
          <View style={styles.daysRow}>
            {dayRewards.slice(4, 7).map((dayReward, idx) => {
              const index = idx + 4;
              const isCompleted = dayReward.day < currentStreak;
              const isToday = dayReward.day === currentStreak;
              const isDay7 = idx === 2;

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
                          : isDay7
                            ? ['#FFB366', '#FF8533']
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
                      (isCompleted || isToday || isDay7) && styles.dayLabelLight,
                      !isCompleted && !isToday && !isDay7 && {color: isDark ? '#808080' : '#666666'},
                    ]}>
                      Day {dayReward.day}
                    </Text>
                    {isCompleted ? (
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.rewardContainer}>
                        <Text style={[
                          styles.rewardXP,
                          (isCompleted || isToday || isDay7) && styles.rewardXPLight,
                          !isCompleted && !isToday && !isDay7 && {color: isDark ? '#808080' : '#666666'},
                        ]}>
                          +{dayReward.xp} XP
                        </Text>
                        {isDay7 && dayReward.credits > 0 && (
                          <View style={styles.bonusTag}>
                            <Ionicons name="logo-usd" size={10} color="#fff" />
                            <Text style={styles.bonusText}>+{dayReward.credits}</Text>
                          </View>
                        )}
                      </View>
                    )}
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
    gap: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  dayBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  dayBoxGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  dayBoxTodayBorder: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  dayLabelLight: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  checkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  rewardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  rewardXP: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  rewardXPLight: {
    color: '#fff',
  },
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  bonusText: {
    fontSize: 10,
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
