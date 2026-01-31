import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Animated, Easing, Image, Modal, TextInput} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useAuthStore, useTicketsStore, useThemeStore, useLevelStore, LEVELS, useAvatarStore, debugTicketsStorage} from '../../store';
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
}> = ({progress, color: _color, backgroundColor, height = 10}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 2,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Animated.View style={[styles.animatedProgressFill, {width: animatedWidth, height, borderRadius: height / 2}]}>
        <LinearGradient
          colors={[COLORS.primary, '#FF8500']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[styles.animatedProgressGradient, {height, borderRadius: height / 2}]}
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

// Level Card Component
const LevelCard: React.FC<{colors: any; onPress: () => void}> = ({colors, onPress}) => {
  const level = useLevelStore(state => state.level);
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
        {/* Header row */}
        <View style={styles.levelHeader}>
          {/* Badge icona livello */}
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[levelInfo.color, levelInfo.color + '88']}
              style={styles.levelBadgeGradient}>
              <Ionicons name={levelInfo.icon as any} size={36} color={COLORS.white} />
            </LinearGradient>
            <View style={styles.levelNumberCircle}>
              <Text style={styles.levelNumberText}>{level}</Text>
            </View>
          </View>

          {/* Info livello */}
          <View style={styles.levelInfo}>
            <Text style={[styles.levelName, {color: levelInfo.color}]}>{levelInfo.name}</Text>
            <Text style={[styles.levelSubtext, {color: colors.textMuted}]}>Livello {level}</Text>
          </View>

        </View>

        {/* Progress */}
        <View style={styles.levelProgress}>
          <View style={styles.levelProgressLabels}>
            <Text style={[styles.levelProgressLabel, {color: levelInfo.color}]}>Lv.{level}</Text>
            <Text style={[styles.levelProgressLabel, {color: nextLevelInfo?.color || colors.textMuted}]}>
              {nextLevelInfo ? `Lv.${nextLevelInfo.level}` : 'MAX'}
            </Text>
          </View>
          <AnimatedProgressBar
            progress={progress}
            color={COLORS.primary}
            backgroundColor={colors.border}
            height={12}
          />
          <View style={styles.levelProgressInfo}>
            <Text style={[styles.levelProgressPercent, {color: colors.textSecondary}]}>{Math.round(progress)}%</Text>
            <Text style={[styles.levelProgressXp, {color: colors.textMuted}]}>
              {xpNeeded > 0 ? `${xpNeeded} XP al prossimo livello` : 'Livello massimo raggiunto!'}
            </Text>
          </View>
        </View>

        {/* Next level */}
        {nextLevelInfo && (
          <View style={[styles.nextLevel, {backgroundColor: `${nextLevelInfo.color}10`, borderColor: `${nextLevelInfo.color}30`}]}>
            <View style={[styles.nextLevelIcon, {backgroundColor: `${nextLevelInfo.color}20`}]}>
              <Ionicons name={nextLevelInfo.icon as any} size={20} color={nextLevelInfo.color} />
            </View>
            <View style={styles.nextLevelText}>
              <Text style={[styles.nextLevelTitle, {color: colors.text}]}>Prossimo: {nextLevelInfo.name}</Text>
              <Text style={[styles.nextLevelXp, {color: colors.textMuted}]}>Raggiungi {nextLevelInfo.minXP} XP</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={nextLevelInfo.color} />
          </View>
        )}

        {/* Hint */}
        <Text style={[styles.levelHint, {color: colors.textMuted}]}>
          Tocca per vedere tutti i livelli e vantaggi
        </Text>
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

// Name Edit Modal Component
const NameEditModal: React.FC<{
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
  colors: any;
}> = ({visible, currentName, onSave, onClose, colors}) => {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Errore', 'Il nome non puo essere vuoto');
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert('Errore', 'Il nome deve avere almeno 2 caratteri');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(trimmedName);
      onClose();
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile salvare il nome');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={nameModalStyles.overlay}>
        <View style={[nameModalStyles.container, {backgroundColor: colors.card}]}>
          <Text style={[nameModalStyles.title, {color: colors.text}]}>Modifica Nome</Text>
          <TextInput
            style={[nameModalStyles.input, {backgroundColor: colors.background, color: colors.text, borderColor: colors.border}]}
            value={name}
            onChangeText={setName}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.textMuted}
            maxLength={30}
            autoFocus
          />
          <View style={nameModalStyles.buttons}>
            <TouchableOpacity style={[nameModalStyles.button, nameModalStyles.cancelButton]} onPress={onClose}>
              <Text style={[nameModalStyles.buttonText, {color: colors.textMuted}]}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[nameModalStyles.button, nameModalStyles.saveButton, isSaving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={isSaving}>
              <Text style={nameModalStyles.saveButtonText}>{isSaving ? 'Salvataggio...' : 'Salva'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const nameModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});

export const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {colors, neon} = useThemeColors();
  const {user, updateDisplayName, refreshUserData} = useAuthStore();
  const {pastTickets, activeTickets} = useTicketsStore();
  const {theme, toggleTheme} = useThemeStore();
  const {getSelectedAvatar, getSelectedFrame, customPhotoUri} = useAvatarStore();
  const [showNameModal, setShowNameModal] = useState(false);

  console.log('ProfileScreen: mounted, pastTickets=', pastTickets.length, 'winners=', pastTickets.filter(t => t.isWinner).length);

  // Refresh user data on mount to get latest wins count
  useEffect(() => {
    refreshUserData();
    // Debug: check AsyncStorage contents
    debugTicketsStorage();
  }, [refreshUserData]);

  // Get current avatar and frame
  const currentAvatar = getSelectedAvatar();
  const currentFrame = getSelectedFrame();

  // Use the higher value between backend wins count and local count
  // This ensures local wins are shown even if backend hasn't synced
  const localWinsCount = pastTickets.filter(t => t.isWinner).length;
  const backendWinsCount = user?.winsCount || 0;
  const winsCount = Math.max(localWinsCount, backendWinsCount);

  // Count ads watched from tickets (all tickets with source='ad')
  const allTickets = [...activeTickets, ...pastTickets];
  const localAdsWatched = allTickets.filter(t => t.source === 'ad').length;
  const backendAdsWatched = user?.watchedAdsCount || 0;
  const adsWatched = Math.max(localAdsWatched, backendAdsWatched);

  console.log('ProfileScreen: stats', {
    localWinsCount, backendWinsCount, winsCount,
    localAdsWatched, backendAdsWatched, adsWatched,
  });

  const menuItems: MenuItem[] = [
    {
      id: 'credits',
      iconName: 'diamond',
      title: 'I Miei Crediti',
      subtitle: `${user?.credits || 0} crediti disponibili`,
      onPress: () => navigation.navigate('Credits'),
    },
    {
      id: 'leaderboard',
      iconName: 'podium',
      title: 'Classifica',
      subtitle: 'Top 100 giocatori',
      onPress: () => navigation.navigate('Leaderboard'),
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
            {/* Avatar with Frame - frame as border only */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={currentFrame.colors}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.avatarFrame}>
                <View style={[styles.avatarInner, {backgroundColor: colors.card, margin: currentFrame.borderWidth}]}>
                  {/* Mostra foto custom o icona avatar */}
                  {customPhotoUri ? (
                    <Image
                      source={{uri: customPhotoUri}}
                      style={styles.avatarPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.avatarIcon, {backgroundColor: currentAvatar.color + '20'}]}>
                      <Ionicons name={currentAvatar.icon as any} size={32} color={currentAvatar.color} />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
            <View style={styles.profileInfoContainer}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, {color: colors.text}]}>{user?.displayName || 'Utente'}</Text>
                <TouchableOpacity
                  style={styles.nameEditButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowNameModal(true);
                  }}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.userEmail, {color: colors.textSecondary}]}>{user?.email || ''}</Text>
            </View>
          </View>

          <View style={[styles.statsRow, {borderTopColor: COLORS.primary}]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.primary}]}>{winsCount}</Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Vincite</Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: COLORS.primary}]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.primary}]}>{adsWatched}</Text>
              <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Ads Viste</Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: COLORS.primary}]} />
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

      {/* Name Edit Modal */}
      <NameEditModal
        visible={showNameModal}
        currentName={user?.displayName || ''}
        onSave={updateDisplayName}
        onClose={() => setShowNameModal(false)}
        colors={colors}
      />
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
    borderRadius: 40,
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameEditButton: {
    marginLeft: SPACING.xs,
    padding: 4,
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
    includeFontPadding: false,
  },
  userEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 0,
    includeFontPadding: false,
  },
  // Level Card styles
  levelCard: {
    marginBottom: SPACING.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  levelBadge: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  levelBadgeGradient: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberCircle: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.white,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    includeFontPadding: false,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelSubtext: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  xpBox: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 60,
  },
  xpValue: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    includeFontPadding: false,
  },
  xpLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.white,
    includeFontPadding: false,
  },
  // Progress
  levelProgress: {
    marginBottom: SPACING.md,
  },
  levelProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  levelProgressLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  levelProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  levelProgressPercent: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  levelProgressXp: {
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
  // Next Level
  nextLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  nextLevelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  nextLevelText: {
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
  levelHint: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: 'italic',
    textAlign: 'center',
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
    textAlign: 'center',
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    includeFontPadding: false,
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
