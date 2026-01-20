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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground} from '../../components/common';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useAvatarStore, AVATARS, FRAMES, Avatar, Frame} from '../../store';
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
const ITEM_SIZE = (width - SPACING.lg * 2 - SPACING.md * 2) / 3;

type Props = NativeStackScreenProps<RootStackParamList, 'AvatarCustomization'>;

// Avatar Preview Component - mostra avatar con cornice come bordo
const AvatarPreview: React.FC<{
  avatar: Avatar;
  frame: Frame;
  colors: any;
}> = ({avatar, frame, colors}) => {
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
      {/* Cornice = solo bordo */}
      <LinearGradient
        colors={frame.colors}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.previewFrame, {borderRadius: 70}]}>
        {/* Interno con sfondo card - la cornice è visibile come bordo */}
        <View style={[styles.previewInner, {backgroundColor: colors.card, margin: frame.borderWidth}]}>
          {/* Avatar icon centrato */}
          <View style={[styles.previewAvatar, {backgroundColor: avatar.color + '20'}]}>
            <Ionicons name={avatar.icon as any} size={60} color={avatar.color} />
          </View>
        </View>
      </LinearGradient>
      <Text style={[styles.previewName, {color: colors.text}]}>{avatar.name}</Text>
      <Text style={[styles.previewFrameName, {color: colors.textMuted}]}>Cornice: {frame.name}</Text>
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
        styles.itemBox,
        {backgroundColor: colors.card},
        isSelected && styles.itemBoxSelected,
        !isUnlocked && styles.itemBoxLocked,
      ]}
      onPress={onSelect}
      disabled={!isUnlocked}
      activeOpacity={0.7}>
      {/* Cerchio avatar */}
      <View style={[styles.avatarCircle, {backgroundColor: avatar.color + '20'}]}>
        <Ionicons
          name={avatar.icon as any}
          size={26}
          color={isUnlocked ? avatar.color : COLORS.textMuted}
        />
      </View>
      {/* Lock overlay */}
      {!isUnlocked && (
        <View style={styles.itemLockOverlay}>
          <Ionicons name="lock-closed" size={14} color={COLORS.white} />
        </View>
      )}
      {/* Nome */}
      <Text style={[styles.itemLabel, {color: isUnlocked ? colors.text : colors.textMuted}]}>
        {avatar.name}
      </Text>
      {/* Unlock level */}
      {!isUnlocked && (
        <Text style={[styles.itemUnlock, {color: colors.textMuted}]}>Lv. {avatar.unlockLevel}</Text>
      )}
      {/* Checkmark se selezionato */}
      {isSelected && isUnlocked && (
        <View style={styles.itemCheck}>
          <Ionicons name="checkmark" size={12} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Frame Item Component - mostra solo il bordo colorato
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
        styles.itemBox,
        {backgroundColor: colors.card},
        isSelected && styles.itemBoxSelected,
        !isUnlocked && styles.itemBoxLocked,
      ]}
      onPress={onSelect}
      disabled={!isUnlocked}
      activeOpacity={0.7}>
      {/* Cornice preview - solo bordo visibile */}
      <LinearGradient
        colors={isUnlocked ? frame.colors : ['#666666', '#444444']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.frameCircle}>
        {/* Centro con colore card = bordo visibile */}
        <View style={[styles.frameCenter, {backgroundColor: colors.card, margin: frame.borderWidth}]} />
      </LinearGradient>
      {/* Lock overlay */}
      {!isUnlocked && (
        <View style={styles.itemLockOverlay}>
          <Ionicons name="lock-closed" size={14} color={COLORS.white} />
        </View>
      )}
      {/* Nome */}
      <Text style={[styles.itemLabel, {color: isUnlocked ? colors.text : colors.textMuted}]}>
        {frame.name}
      </Text>
      {/* Unlock level */}
      {!isUnlocked && (
        <Text style={[styles.itemUnlock, {color: colors.textMuted}]}>Lv. {frame.unlockLevel}</Text>
      )}
      {/* Checkmark se selezionato */}
      {isSelected && isUnlocked && (
        <View style={styles.itemCheck}>
          <Ionicons name="checkmark" size={12} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const AvatarCustomizationScreen: React.FC<Props> = ({navigation}) => {
  const {colors, gradientColors, isDark, neon} = useThemeColors();
  const {
    selectedAvatarId,
    selectedFrameId,
    setAvatar,
    setFrame,
    getSelectedAvatar,
    getSelectedFrame,
  } = useAvatarStore();

  const [activeTab, setActiveTab] = useState<'avatars' | 'frames'>('avatars');

  const currentAvatar = getSelectedAvatar();
  const currentFrame = getSelectedFrame();

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
          <AvatarPreview avatar={currentAvatar} frame={currentFrame} colors={colors} />
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
        <View style={styles.grid}>
          {activeTab === 'avatars'
            ? AVATARS.map(avatar => (
                <AvatarItem
                  key={avatar.id}
                  avatar={avatar}
                  isSelected={selectedAvatarId === avatar.id}
                  isUnlocked={true}
                  onSelect={() => setAvatar(avatar.id)}
                />
              ))
            : FRAMES.map(frame => (
                <FrameItem
                  key={frame.id}
                  frame={frame}
                  isSelected={selectedFrameId === frame.id}
                  isUnlocked={true}
                  onSelect={() => setFrame(frame.id)}
                />
              ))}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, {backgroundColor: colors.card}, neon.glowSubtle]}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={[styles.infoText, {color: colors.textMuted}]}>
            Sali di livello per sbloccare nuovi avatar e cornici!
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
    marginBottom: SPACING.md,
  },
  previewInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 4,
  },
  previewFrameName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  // Item Box
  itemBox: {
    width: ITEM_SIZE,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  itemBoxSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  itemBoxLocked: {
    opacity: 0.6,
  },

  // Avatar Circle
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },

  // Frame Circle - solo bordo
  frameCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: SPACING.xs,
  },
  frameCenter: {
    flex: 1,
    borderRadius: 26,
  },

  // Item elements
  itemLockOverlay: {
    position: 'absolute',
    top: SPACING.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  itemLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  itemUnlock: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  itemCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
