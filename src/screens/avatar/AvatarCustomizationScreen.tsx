import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground} from '../../components/common';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useAvatarStore, useLevelStore, AVATARS, FRAMES, Avatar, Frame} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width} = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'AvatarCustomization'>;

// Avatar Preview Component
const AvatarPreview: React.FC<{
  avatar: Avatar;
  frame: Frame;
}> = ({avatar, frame}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [avatar.id, frame.id]);

  return (
    <Animated.View style={[styles.previewContainer, {transform: [{scale: scaleAnim}]}]}>
      <LinearGradient
        colors={frame.colors}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.previewFrame, {padding: frame.borderWidth}]}>
        <View style={[styles.previewInner, {backgroundColor: avatar.color + '20'}]}>
          <Ionicons name={avatar.icon as any} size={60} color={avatar.color} />
        </View>
      </LinearGradient>
      <Text style={styles.previewName}>{avatar.name}</Text>
      <Text style={styles.previewFrameName}>Cornice: {frame.name}</Text>
    </Animated.View>
  );
};

// Avatar Item Component
const AvatarItem: React.FC<{
  avatar: Avatar;
  isSelected: boolean;
  isUnlocked: boolean;
  onSelect: () => void;
}> = ({avatar, isSelected, isUnlocked, onSelect}) => {
  const {colors} = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        {backgroundColor: colors.card},
        isSelected && styles.itemSelected,
        !isUnlocked && styles.itemLocked,
      ]}
      onPress={onSelect}
      disabled={!isUnlocked}
      activeOpacity={0.7}>
      <View style={[styles.itemIconContainer, {backgroundColor: avatar.color + '20'}]}>
        <Ionicons
          name={avatar.icon as any}
          size={28}
          color={isUnlocked ? avatar.color : COLORS.textMuted}
        />
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          </View>
        )}
      </View>
      <Text style={[styles.itemName, {color: isUnlocked ? colors.text : colors.textMuted}]}>
        {avatar.name}
      </Text>
      {!isUnlocked && (
        <Text style={styles.itemUnlockText}>Lv. {avatar.unlockLevel}</Text>
      )}
      {isSelected && isUnlocked && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={14} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Frame Item Component
const FrameItem: React.FC<{
  frame: Frame;
  isSelected: boolean;
  isUnlocked: boolean;
  onSelect: () => void;
}> = ({frame, isSelected, isUnlocked, onSelect}) => {
  const {colors} = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        {backgroundColor: colors.card},
        isSelected && styles.itemSelected,
        !isUnlocked && styles.itemLocked,
      ]}
      onPress={onSelect}
      disabled={!isUnlocked}
      activeOpacity={0.7}>
      <View style={styles.framePreviewContainer}>
        <LinearGradient
          colors={isUnlocked ? frame.colors : ['#666666', '#444444']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.framePreview, {padding: frame.borderWidth}]}>
          <View style={[styles.framePreviewInner, {backgroundColor: colors.card}]} />
        </LinearGradient>
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          </View>
        )}
      </View>
      <Text style={[styles.itemName, {color: isUnlocked ? colors.text : colors.textMuted}]}>
        {frame.name}
      </Text>
      {!isUnlocked && (
        <Text style={styles.itemUnlockText}>Lv. {frame.unlockLevel}</Text>
      )}
      {isSelected && isUnlocked && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark" size={14} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const AvatarCustomizationScreen: React.FC<Props> = ({navigation}) => {
  const {colors, gradientColors, isDark, neon} = useThemeColors();
  const {level} = useLevelStore();
  const {
    selectedAvatarId,
    selectedFrameId,
    setAvatar,
    setFrame,
    getSelectedAvatar,
    getSelectedFrame,
    isAvatarUnlocked,
    isFrameUnlocked,
  } = useAvatarStore();

  const [activeTab, setActiveTab] = useState<'avatars' | 'frames'>('avatars');

  const currentAvatar = getSelectedAvatar();
  const currentFrame = getSelectedFrame();

  const handleSelectAvatar = (avatarId: string) => {
    // All unlocked for testing
    setAvatar(avatarId);
  };

  const handleSelectFrame = (frameId: string) => {
    // All unlocked for testing
    setFrame(frameId);
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Personalizza Avatar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Avatar Preview */}
        <View style={[styles.previewSection, {backgroundColor: colors.card}, neon.glowSubtle]}>
          <AvatarPreview avatar={currentAvatar} frame={currentFrame} />
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.levelBadgeGradient}>
              <View style={styles.levelBadgeContent}>
                <Text style={styles.levelBadgeText}>Livello {level}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, {backgroundColor: colors.card}]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'avatars' && styles.tabActive]}
            onPress={() => setActiveTab('avatars')}>
            <Ionicons
              name="person"
              size={20}
              color={activeTab === 'avatars' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'avatars' && styles.tabTextActive]}>
              Avatar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'frames' && styles.tabActive]}
            onPress={() => setActiveTab('frames')}>
            <Ionicons
              name="ellipse-outline"
              size={20}
              color={activeTab === 'frames' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'frames' && styles.tabTextActive]}>
              Cornici
            </Text>
          </TouchableOpacity>
        </View>

        {/* Items Grid */}
        <View style={styles.gridContainer}>
          {activeTab === 'avatars' ? (
            <View style={styles.grid}>
              {AVATARS.map(avatar => (
                <AvatarItem
                  key={avatar.id}
                  avatar={avatar}
                  isSelected={selectedAvatarId === avatar.id}
                  isUnlocked={true} // All unlocked for testing
                  onSelect={() => handleSelectAvatar(avatar.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {FRAMES.map(frame => (
                <FrameItem
                  key={frame.id}
                  frame={frame}
                  isSelected={selectedFrameId === frame.id}
                  isUnlocked={true} // All unlocked for testing
                  onSelect={() => handleSelectFrame(frame.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, {backgroundColor: colors.card}, neon.glowSubtle]}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={[styles.infoText, {color: colors.textMuted}]}>
            Sali di livello per sbloccare nuovi avatar e cornici! Ogni livello sblocca nuove opzioni di personalizzazione.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xl + 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  // Preview Section
  previewSection: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewFrame: {
    borderRadius: 70,
    marginBottom: SPACING.md,
  },
  previewInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  previewFrameName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  levelBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    borderRadius: RADIUS.md,
  },
  levelBadgeGradient: {
    borderRadius: RADIUS.md,
  },
  levelBadgeContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Grid
  gridContainer: {
    marginBottom: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  // Item
  itemContainer: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2) / 3,
    alignItems: 'center',
    padding: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  itemSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  itemLocked: {
    opacity: 0.6,
  },
  itemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  itemUnlockText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Frame Preview
  framePreviewContainer: {
    width: 56,
    height: 56,
    marginBottom: SPACING.xs,
    position: 'relative',
  },
  framePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  framePreviewInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
});

export default AvatarCustomizationScreen;
