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
  Image,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
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
  customPhotoUri?: string | null;
}> = ({avatar, frame, colors, customPhotoUri}) => {
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
  }, [avatar.id, frame.id, customPhotoUri]);

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
          {/* Avatar icon o foto custom */}
          {customPhotoUri ? (
            <Image
              source={{uri: customPhotoUri}}
              style={styles.previewPhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.previewAvatar, {backgroundColor: avatar.color + '20'}]}>
              <Ionicons name={avatar.icon as any} size={60} color={avatar.color} />
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={[styles.previewName, {color: colors.text}]}>
        {customPhotoUri ? 'Foto Personale' : avatar.name}
      </Text>
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
    customPhotoUri,
    setAvatar,
    setFrame,
    setCustomPhoto,
    getSelectedAvatar,
    getSelectedFrame,
  } = useAvatarStore();

  const [activeTab, setActiveTab] = useState<'avatars' | 'frames' | 'photo'>('avatars');

  const currentAvatar = getSelectedAvatar();
  const currentFrame = getSelectedFrame();

  const handleImageResponse = (response: ImagePickerResponse) => {
    console.log('Image picker response:', JSON.stringify(response, null, 2));

    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.log('Image picker error:', response.errorCode, response.errorMessage);
      let errorMessage = response.errorMessage || 'Si è verificato un errore';

      if (response.errorCode === 'camera_unavailable') {
        errorMessage = 'Fotocamera non disponibile su questo dispositivo';
      } else if (response.errorCode === 'permission') {
        errorMessage = 'Permesso negato. Vai nelle impostazioni per abilitare l\'accesso.';
      }

      Alert.alert('Errore', errorMessage);
      return;
    }

    if (response.assets && response.assets.length > 0 && response.assets[0]?.uri) {
      console.log('Setting photo URI:', response.assets[0].uri);
      setCustomPhoto(response.assets[0].uri);
    } else {
      console.log('No assets in response');
    }
  };

  const openCamera = async () => {
    try {
      console.log('Opening camera...');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
        saveToPhotos: false,
      });
      console.log('Camera result:', result);
      handleImageResponse(result);
    } catch (error: any) {
      console.log('Camera error:', error);
      console.log('Camera error message:', error?.message);
      console.log('Camera error stack:', error?.stack);
      Alert.alert(
        'Errore Fotocamera',
        `${error?.message || 'Impossibile aprire la fotocamera'}\n\nRicompila l'app da Xcode se il problema persiste.`,
      );
    }
  };

  const openGallery = async () => {
    try {
      console.log('Opening gallery...');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
        selectionLimit: 1,
      });
      console.log('Gallery result:', result);
      handleImageResponse(result);
    } catch (error: any) {
      console.log('Gallery error:', error);
      console.log('Gallery error message:', error?.message);
      console.log('Gallery error stack:', error?.stack);
      Alert.alert(
        'Errore Galleria',
        `${error?.message || 'Impossibile aprire la galleria'}\n\nRicompila l'app da Xcode se il problema persiste.`,
      );
    }
  };

  const removePhoto = () => {
    setCustomPhoto(null);
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
          <AvatarPreview
            avatar={currentAvatar}
            frame={currentFrame}
            colors={colors}
            customPhotoUri={customPhotoUri}
          />
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, {backgroundColor: colors.card}]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'avatars' && styles.tabActive]}
            onPress={() => setActiveTab('avatars')}>
            <Ionicons
              name="person"
              size={18}
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
              size={18}
              color={activeTab === 'frames' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'frames' && styles.tabTextActive]}>
              Cornici
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'photo' && styles.tabActive]}
            onPress={() => setActiveTab('photo')}>
            <Ionicons
              name="camera"
              size={18}
              color={activeTab === 'photo' ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'photo' && styles.tabTextActive]}>
              Foto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Items Grid */}
        {activeTab === 'avatars' && (
          <View style={styles.grid}>
            {AVATARS.map(avatar => (
              <AvatarItem
                key={avatar.id}
                avatar={avatar}
                isSelected={selectedAvatarId === avatar.id && !customPhotoUri}
                isUnlocked={true}
                onSelect={() => setAvatar(avatar.id)}
              />
            ))}
          </View>
        )}

        {activeTab === 'frames' && (
          <View style={styles.grid}>
            {FRAMES.map(frame => (
              <FrameItem
                key={frame.id}
                frame={frame}
                isSelected={selectedFrameId === frame.id}
                isUnlocked={true}
                onSelect={() => setFrame(frame.id)}
              />
            ))}
          </View>
        )}

        {activeTab === 'photo' && (
          <View style={styles.photoSection}>
            {/* Current Photo Preview */}
            {customPhotoUri && (
              <View style={[styles.currentPhotoContainer, {backgroundColor: colors.card}]}>
                <Image
                  source={{uri: customPhotoUri}}
                  style={styles.currentPhotoImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={removePhoto}
                  activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            )}

            {/* Photo Action Buttons */}
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={[styles.photoButton, {backgroundColor: colors.card}]}
                onPress={openCamera}
                activeOpacity={0.7}>
                <View style={[styles.photoButtonIcon, {backgroundColor: COLORS.primary + '20'}]}>
                  <Ionicons name="camera" size={32} color={COLORS.primary} />
                </View>
                <Text style={[styles.photoButtonText, {color: colors.text}]}>
                  Scatta Foto
                </Text>
                <Text style={[styles.photoButtonSubtext, {color: colors.textMuted}]}>
                  Usa la fotocamera
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoButton, {backgroundColor: colors.card}]}
                onPress={openGallery}
                activeOpacity={0.7}>
                <View style={[styles.photoButtonIcon, {backgroundColor: COLORS.secondary + '20'}]}>
                  <Ionicons name="images" size={32} color={COLORS.secondary} />
                </View>
                <Text style={[styles.photoButtonText, {color: colors.text}]}>
                  Galleria
                </Text>
                <Text style={[styles.photoButtonSubtext, {color: colors.textMuted}]}>
                  Scegli dalla libreria
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

  // Photo Section
  photoSection: {
    marginBottom: SPACING.lg,
  },
  currentPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    position: 'relative',
  },
  currentPhotoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removePhotoButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  photoButtonIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  photoButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 4,
  },
  photoButtonSubtext: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
  previewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default AvatarCustomizationScreen;
