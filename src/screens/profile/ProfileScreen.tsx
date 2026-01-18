import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Animated, Easing} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useAuthStore, useTicketsStore, useThemeStore, useLevelStore, LEVELS, useAvatarStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

// Animated Progress Bar Component
const AnimatedProgressBar: React.FC<{
  progress: number;
  color: string;
  backgroundColor: string;
  height?: number;
}> = ({progress, color, backgroundColor, height = 10}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 2,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmerPosition.interpolate({
    inputRange: [-1, 2],
    outputRange: [-100, 300],
  });

  return (
    <View style={[styles.animatedProgressBg, {backgroundColor, height, borderRadius: height / 2}]}>
      <Animated.View style={[styles.animatedProgressFill, {width: animatedWidth, borderRadius: height / 2}]}>
        <LinearGradient
          colors={[color, color + 'CC']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[styles.animatedProgressGradient, {borderRadius: height / 2}]}
        />
        <Animated.View
          style={[
            styles.progressShimmer,
            {transform: [{translateX: shimmerTranslate}]},
          ]}
        />
      </Animated.View>
    </View>
  );
};

// Level Card Component - Enhanced with animations, now clickable
const LevelCard: React.FC<{colors: any; onPress: () => void}> = ({colors, onPress}) => {
  // Subscribe to specific state values for reactivity
  const level = useLevelStore(state => state.level);
  const totalXP = useLevelStore(state => state.totalXP);
  const getLevelInfo = useLevelStore(state => state.getLevelInfo);
  const getProgressToNextLevel = useLevelStore(state => state.getProgressToNextLevel);
  const getXPForNextLevel = useLevelStore(state => state.getXPForNextLevel);
  const {neon} = useThemeColors();

  const levelInfo = getLevelInfo();
  const nextLevelInfo = LEVELS.find(l => l.level === level + 1);
  const progress = getProgressToNextLevel();
  const xpNeeded = getXPForNextLevel();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={[styles.levelCard, neon.glowSubtle]}>
        {/* Level Header with Large Badge */}
        <View style={styles.levelMainHeader}>
          <View style={[styles.levelBadgeContainer, neon.glowStrong]}>
            <LinearGradient
              colors={[levelInfo.color, levelInfo.color + '88']}
              style={styles.levelBadgeLargeGradient}>
              <Ionicons name={levelInfo.icon as any} size={36} color={COLORS.white} />
            </LinearGradient>
            <View style={styles.levelNumberBadge}>
              <Text style={styles.levelNumberText}>{level}</Text>
            </View>
          </View>
          <View style={styles.levelMainInfo}>
            <Text style={[styles.levelRankName, {color: levelInfo.color}]}>{levelInfo.name}</Text>
            <Text style={[styles.levelSubtitle, {color: colors.textMuted}]}>Livello {level}</Text>
          </View>
          <View style={[styles.totalXpContainer, {backgroundColor: `${colors.primary}15`}]}>
            <Text style={[styles.totalXpValue, {color: colors.primary}]}>{totalXP}</Text>
            <Text style={[styles.totalXpLabel, {color: colors.textMuted}]}>XP</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={[styles.currentLevelLabel, {color: levelInfo.color}]}>
              Lv.{level}
            </Text>
            <Text style={[styles.nextLevelLabel, {color: nextLevelInfo?.color || colors.textMuted}]}>
              {nextLevelInfo ? `Lv.${nextLevelInfo.level}` : 'MAX'}
            </Text>
          </View>
          <AnimatedProgressBar
            progress={progress}
            color={levelInfo.color}
            backgroundColor={colors.border}
            height={12}
          />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressPercentage, {color: colors.textSecondary}]}>
              {Math.round(progress)}%
            </Text>
            <Text style={[styles.xpRemaining, {color: colors.textMuted}]}>
              {xpNeeded > 0 ? `${xpNeeded} XP al prossimo livello` : 'Livello massimo raggiunto!'}
            </Text>
          </View>
        </View>

        {/* Next Level Preview */}
        {nextLevelInfo && (
          <View style={[styles.nextLevelPreview, {backgroundColor: `${nextLevelInfo.color}10`, borderColor: `${nextLevelInfo.color}30`}]}>
            <View style={[styles.nextLevelIconContainer, {backgroundColor: `${nextLevelInfo.color}20`}]}>
              <Ionicons name={nextLevelInfo.icon as any} size={20} color={nextLevelInfo.color} />
            </View>
            <View style={styles.nextLevelInfo}>
              <Text style={[styles.nextLevelTitle, {color: colors.text}]}>Prossimo: {nextLevelInfo.name}</Text>
              <Text style={[styles.nextLevelXp, {color: colors.textMuted}]}>
                Raggiungi {nextLevelInfo.minXP} XP
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={nextLevelInfo.color} />
          </View>
        )}

        {/* Tap to view all levels hint */}
        <View style={styles.viewAllHint}>
          <Text style={[styles.viewAllHintText, {color: colors.textMuted}]}>
            Tocca per vedere tutti i livelli e vantaggi
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

interface ProfileScreenProps {
  navigation: any;
}

interface MenuItem {
  id: string;
  iconName: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {colors, neon} = useThemeColors();
  const {user} = useAuthStore();
  const {pastTickets} = useTicketsStore();
  const {theme, toggleTheme} = useThemeStore();
  const {getSelectedAvatar, getSelectedFrame} = useAvatarStore();

  // Get current avatar and frame
  const currentAvatar = getSelectedAvatar();
  const currentFrame = getSelectedFrame();

  // Count winning tickets
  const winsCount = pastTickets.filter(t => t.isWinner).length;

  const menuItems: MenuItem[] = [
    {
      id: 'credits',
      iconName: 'diamond',
      title: 'I Miei Crediti',
      subtitle: `${user?.credits || 0} crediti disponibili`,
      onPress: () => navigation.navigate('Credits'),
    },
    {
      id: 'wins',
      iconName: 'trophy',
      title: 'Le Mie Vincite',
      subtitle: 'Storico premi vinti',
      onPress: () => navigation.navigate('MyWins'),
    },
    {
      id: 'referral',
      iconName: 'gift',
      title: 'Invita Amici',
      subtitle: `Codice: ${user?.referralCode || 'N/A'}`,
      onPress: () => navigation.navigate('Referral'),
    },
    {
      id: 'address',
      iconName: 'location',
      title: 'Indirizzo di Spedizione',
      subtitle: user?.shippingAddress ? 'Configurato' : 'Non configurato',
      onPress: () => navigation.navigate('AddressForm'),
    },
    {
      id: 'settings',
      iconName: 'settings',
      title: 'Impostazioni',
      subtitle: 'Notifiche, privacy',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, {borderBottomColor: colors.border}]}
      onPress={item.onPress}>
      <View style={[styles.menuIconContainer, {backgroundColor: `${colors.primary}15`}]}>
        <Ionicons name={item.iconName} size={22} color={colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, {color: colors.text}]}>{item.title}</Text>
        {item.subtitle && (
          <Text style={[styles.menuSubtitle, {color: colors.textSecondary}]}>{item.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Profile Header - Avatar Inline with Name/Email - Clickable for Avatar Customization */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AvatarCustomization')}>
        <Card style={[styles.profileCard, neon.glowSubtle]}>
          {/* Edit Icon in top right */}
          <View style={styles.editIconContainer}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </View>
          <View style={styles.profileHeaderRow}>
            {/* Avatar with Frame */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={currentFrame.colors}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.avatarFrame, {padding: currentFrame.borderWidth}]}>
                <View style={[styles.avatarInner, {backgroundColor: currentAvatar.color + '20'}]}>
                  <Ionicons name={currentAvatar.icon as any} size={32} color={currentAvatar.color} />
                </View>
              </LinearGradient>
            </View>
            <View style={styles.profileInfoContainer}>
              <Text style={[styles.userName, {color: colors.text}]}>{user?.displayName || 'Utente'}</Text>
              <Text style={[styles.userEmail, {color: colors.textSecondary}]}>{user?.email || ''}</Text>
            </View>
          </View>

          <View style={[styles.statsRow, {borderTopColor: colors.border}]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.primary}]}>{winsCount}</Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Vincite</Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.primary}]}>{user?.watchedAdsCount || 0}</Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Ads Viste</Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.primary}]}>{user?.credits || 0}</Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Crediti</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Level Card - Clickable */}
      <LevelCard colors={colors} onPress={() => navigation.navigate('LevelDetail')} />

      {/* Menu Items */}
      <Card style={styles.menuCard} padding="none">
        {menuItems.map(renderMenuItem)}
      </Card>

      {/* Theme Switcher */}
      <Card style={styles.themeCard}>
        <View style={styles.themeRow}>
          <View style={[styles.themeIconContainer, {backgroundColor: `${colors.primary}15`}]}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny'}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.themeContent}>
            <Text style={[styles.themeTitle, {color: colors.text}]}>Tema</Text>
            <Text style={[styles.themeSubtitle, {color: colors.textSecondary}]}>
              {theme === 'dark' ? 'Modalita scura' : 'Modalita chiara'}
            </Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{false: colors.border, true: colors.primary}}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* Support */}
      <Card style={styles.supportCard}>
        <TouchableOpacity
          style={styles.supportItem}
          onPress={() => Alert.alert('Aiuto', 'Funzionalita in arrivo!')}>
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.supportText, {color: colors.textSecondary}]}>Centro Assistenza</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.supportItem}
          onPress={() => Alert.alert('Feedback', 'Funzionalita in arrivo!')}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
          <Text style={[styles.supportText, {color: colors.textSecondary}]}>Invia Feedback</Text>
        </TouchableOpacity>
      </Card>

      <Text style={[styles.version, {color: colors.textLight}]}>RaffleMania v1.0.0</Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Profile Header - Inline Layout
  profileCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    position: 'relative',
  },
  editIconContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  avatarFrame: {
    borderRadius: 38,
  },
  avatarInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Level Card styles
  levelCard: {
    marginBottom: SPACING.md,
  },
  levelMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  levelBadgeContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  levelBadgeLargeGradient: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.white,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  levelNumberText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  levelMainInfo: {
    flex: 1,
  },
  levelRankName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  totalXpContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  totalXpValue: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  totalXpLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  // Progress Section
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  currentLevelLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  nextLevelLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  xpRemaining: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  // Animated Progress Bar
  animatedProgressBg: {
    overflow: 'hidden',
  },
  animatedProgressFill: {
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  animatedProgressGradient: {
    flex: 1,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{skewX: '-25deg'}],
  },
  // Next Level Preview
  nextLevelPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  nextLevelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  nextLevelInfo: {
    flex: 1,
  },
  nextLevelTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  nextLevelXp: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  viewAllHint: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  viewAllHintText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  menuCard: {
    marginBottom: SPACING.md,
  },
  themeCard: {
    marginBottom: SPACING.md,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  themeContent: {
    flex: 1,
  },
  themeTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  themeSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  supportCard: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  supportItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  supportText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.sm,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
});

export default ProfileScreen;
