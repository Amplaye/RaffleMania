import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useLevelStore} from '../../store';
import {useGameConfigStore} from '../../store/useGameConfigStore';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

// Benefits are now fetched from server via LEVELS (useGameConfigStore)

interface LevelDetailScreenProps {
  navigation: any;
}

// Level Item Component
const LevelItem: React.FC<{
  levelInfo: {level: number; name: string; minXP: number; maxXP: number; icon: string; color: string; creditReward: number; benefits: string[]};
  currentLevel: number;
  totalXP: number;
  colors: any;
  index: number;
}> = ({levelInfo, currentLevel, totalXP, colors, index}) => {
  const {neon} = useThemeColors();
  const isUnlocked = currentLevel >= levelInfo.level;
  const isCurrent = currentLevel === levelInfo.level;
  const benefits = levelInfo.benefits || [];

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacityAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.levelItemContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <Card style={[
        styles.levelItem,
        isCurrent && styles.levelItemCurrent,
        isCurrent && neon.glow,
        !isUnlocked && styles.levelItemLocked,
      ]}>
        {/* Level Badge */}
        <View style={styles.levelItemHeader}>
          <View style={[styles.levelBadgeWrapper, isUnlocked && neon.glowStrong]}>
            {isUnlocked ? (
              <LinearGradient
                colors={[levelInfo.color, levelInfo.color + '88']}
                style={styles.levelBadge}>
                <Ionicons name={levelInfo.icon as any} size={28} color={COLORS.white} />
              </LinearGradient>
            ) : (
              <View style={[styles.levelBadge, styles.levelBadgeLocked]}>
                <Ionicons name="lock-closed" size={28} color={COLORS.textMuted} />
              </View>
            )}
            <View style={[
              styles.levelNumberCircle,
              {backgroundColor: isUnlocked ? levelInfo.color : COLORS.border},
            ]}>
              <Text style={[
                styles.levelNumberSmall,
                {color: isUnlocked ? COLORS.white : COLORS.textMuted},
              ]}>{levelInfo.level}</Text>
            </View>
          </View>

          <View style={styles.levelItemInfo}>
            <Text style={[
              styles.levelItemName,
              {color: isUnlocked ? levelInfo.color : COLORS.textMuted},
            ]}>
              {levelInfo.name}
            </Text>
            <Text style={[styles.levelItemXp, {color: colors.textSecondary}]}>
              {levelInfo.minXP.toLocaleString()} - {levelInfo.maxXP === 999999 ? '∞' : levelInfo.maxXP.toLocaleString()} XP
            </Text>
          </View>

          {isUnlocked && (
            <View style={[styles.unlockedBadge, {backgroundColor: `${levelInfo.color}20`}]}>
              <Ionicons name="checkmark-circle" size={20} color={levelInfo.color} />
            </View>
          )}
        </View>

        {/* Benefits List */}
        <View style={[styles.benefitsContainer, {borderTopColor: colors.border}]}>
          <Text style={[styles.benefitsTitle, {color: colors.textMuted}]}>
            {isUnlocked ? 'Vantaggi sbloccati:' : 'Vantaggi da sbloccare:'}
          </Text>
          {benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={[
                styles.benefitDot,
                {backgroundColor: isUnlocked ? levelInfo.color : COLORS.textMuted},
              ]} />
              <Text style={[
                styles.benefitText,
                {color: isUnlocked ? colors.text : colors.textMuted},
              ]}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {/* Credit Reward */}
        {levelInfo.creditReward > 0 && (
          <View style={[styles.creditRewardContainer, {backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '30'}]}>
            <Ionicons name="gift" size={18} color={COLORS.primary} />
            <Text style={[styles.creditRewardText, {color: isUnlocked ? colors.text : colors.textMuted}]}>
              +{levelInfo.creditReward} crediti bonus al raggiungimento
            </Text>
          </View>
        )}

        {/* Progress to this level (if not yet reached) */}
        {!isUnlocked && (
          <View style={styles.progressToLevel}>
            <View style={[styles.progressToLevelBar, {backgroundColor: colors.border}]}>
              <View
                style={[
                  styles.progressToLevelFill,
                  {
                    width: `${Math.min((totalXP / levelInfo.minXP) * 100, 100)}%`,
                  },
                ]}>
                <LinearGradient
                  colors={[COLORS.primary, '#FF8500']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.progressGradient}
                />
              </View>
            </View>
            <Text style={[styles.progressToLevelText, {color: colors.textMuted}]}>
              {totalXP.toLocaleString()} / {levelInfo.minXP.toLocaleString()} XP
            </Text>
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

export const LevelDetailScreen: React.FC<LevelDetailScreenProps> = ({navigation}) => {
  const {colors, neon} = useThemeColors();
  const {level, totalXP, getLevelInfo} = useLevelStore();
  const dynamicLevels = useGameConfigStore(s => s.getLevels());
  const currentLevelInfo = getLevelInfo();

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
        <Text style={[styles.screenTitle, {color: colors.text}]}>Sistema Livelli</Text>
        <View style={styles.headerSpacer} />
      </View>

        {/* Current Level Summary */}
        <View style={styles.header}>
          <View style={[styles.balanceCard, neon.glowStrong]}>
            <LinearGradient
              colors={[COLORS.primary, '#FF6B00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.balanceGradient}>
              <View style={styles.balanceContentWrapper}>
                <View style={styles.balanceContentRow}>
                  <View style={styles.levelIconContainer}>
                    <Ionicons name={currentLevelInfo.icon as any} size={40} color={COLORS.white} />
                  </View>
                  <View style={styles.levelInfoContainer}>
                    <Text style={styles.balanceLabel}>Il tuo livello</Text>
                    <Text style={styles.levelName}>{currentLevelInfo.name}</Text>
                    <Text style={styles.balanceSubtext}>{totalXP.toLocaleString()} XP totali</Text>
                  </View>
                  <View style={styles.levelNumberBadge}>
                    <Text style={styles.levelNumberText}>{level}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* All Levels */}
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Tutti i Livelli</Text>

        {dynamicLevels.map((levelInfo, index) => (
          <LevelItem
            key={levelInfo.level}
            levelInfo={levelInfo}
            currentLevel={level}
            totalXP={totalXP}
            colors={colors}
            index={index}
          />
        ))}

        <View style={styles.bottomPadding} />
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
  // Balance Card (same as Credits page)
  header: {
    paddingVertical: SPACING.md,
  },
  balanceCard: {
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceGradient: {
    borderRadius: RADIUS.xl,
  },
  balanceContentWrapper: {
    padding: SPACING.lg,
  },
  balanceContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  levelInfoContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  levelName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginTop: 2,
  },
  balanceSubtext: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  levelNumberBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberText: {
    fontSize: FONT_SIZE.xxl,
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
  // Level Item
  levelItemContainer: {
    marginBottom: SPACING.md,
  },
  levelItem: {
    padding: SPACING.md,
  },
  levelItemCurrent: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  levelItemLocked: {
    opacity: 0.7,
  },
  levelItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadgeWrapper: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeLocked: {
    backgroundColor: COLORS.border,
  },
  levelNumberCircle: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberSmall: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelItemInfo: {
    flex: 1,
  },
  levelItemName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelItemXp: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  currentBadge: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  currentBadgeGradient: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  unlockedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Benefits
  benefitsContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  benefitsTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  benefitText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
  },
  creditRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  creditRewardText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
  },
  // Progress to level
  progressToLevel: {
    marginTop: SPACING.md,
  },
  progressToLevelBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressToLevelFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressToLevelText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'right',
  },
  bottomPadding: {
    height: SPACING.xl,
  },
});

export default LevelDetailScreen;
