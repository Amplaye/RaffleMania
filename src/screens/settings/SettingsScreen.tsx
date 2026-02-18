import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer, Card} from '../../components/common';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useAuthStore} from '../../store';
import {useSettingsStore} from '../../store/useSettingsStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface SettingsScreenProps {
  navigation: any;
}

interface SettingToggle {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
}

interface SettingLink {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {colors} = useThemeColors();
  const {logout, deleteAccount, isLoading, token} = useAuthStore();
  const {notifications, setNotificationPreference} = useSettingsStore();
  const isGuestUser = token?.startsWith('guest_token_');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const toggleSettings: SettingToggle[] = [
    {
      id: 'push',
      icon: 'notifications',
      title: 'Notifiche push',
      subtitle: 'Ricevi notifiche sul tuo dispositivo',
      value: notifications.pushEnabled,
    },
    {
      id: 'email',
      icon: 'mail',
      title: 'Notifiche email',
      subtitle: 'Ricevi aggiornamenti via email',
      value: notifications.emailEnabled,
    },
    {
      id: 'reminders',
      icon: 'alarm',
      title: 'Promemoria estrazioni',
      subtitle: 'Ricorda quando sta per iniziare un estrazione',
      value: notifications.drawReminders,
    },
    {
      id: 'adCooldown',
      icon: 'play-circle',
      title: 'Notifiche pubblicità',
      subtitle: 'Avvisa quando puoi guardare una nuova pubblicità',
      value: notifications.adCooldownNotifications,
    },
  ];

  const handleToggle = (id: string) => {
    const keyMap: Record<string, 'pushEnabled' | 'emailEnabled' | 'drawReminders' | 'winNotifications' | 'adCooldownNotifications'> = {
      push: 'pushEnabled',
      email: 'emailEnabled',
      reminders: 'drawReminders',
      wins: 'winNotifications',
      adCooldown: 'adCooldownNotifications',
    };
    const key = keyMap[id];
    if (key) {
      const currentValue = notifications[key];
      setNotificationPreference(key, !currentValue);
    }
  };

  const linkSettings: SettingLink[] = [
    {
      id: 'faq',
      icon: 'help-circle',
      title: 'FAQ',
      subtitle: 'Domande frequenti',
      onPress: () => navigation.navigate('Faq'),
    },
    {
      id: 'rate',
      icon: 'star',
      title: 'Valuta l\'app',
      subtitle: 'Lascia una recensione',
      onPress: () => {
        const storeUrl = Platform.select({
          ios: 'https://apps.apple.com/app/id/XXXXXXXXXX', // TODO: replace with actual App Store ID
          android: 'https://play.google.com/store/apps/details?id=com.rafflemaniaapp',
        });
        if (storeUrl) {
          Linking.openURL(storeUrl);
        }
      },
    },
    {
      id: 'privacy',
      icon: 'shield-checkmark',
      title: 'Privacy Policy',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      id: 'terms',
      icon: 'document-text',
      title: 'Termini di Servizio',
      onPress: () => navigation.navigate('Terms'),
    },
    {
      id: 'cookies',
      icon: 'browsers-outline',
      title: 'Cookie Policy',
      onPress: () => navigation.navigate('CookiePolicy'),
    },
  ];

  const renderToggleSetting = (setting: SettingToggle) => (
    <View key={setting.id} style={styles.settingItem}>
      <View style={[styles.settingIconContainer, {backgroundColor: `${colors.primary}15`}]}>
        <Ionicons name={setting.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, {color: colors.text}]}>{setting.title}</Text>
        <Text style={[styles.settingSubtitle, {color: colors.textMuted}]}>{setting.subtitle}</Text>
      </View>
      <Switch
        value={setting.value}
        onValueChange={() => handleToggle(setting.id)}
        trackColor={{false: colors.border, true: colors.primary}}
        thumbColor={setting.value ? '#FFFFFF' : colors.textMuted}
      />
    </View>
  );

  const renderLinkSetting = (setting: SettingLink) => (
    <TouchableOpacity
      key={setting.id}
      style={styles.settingItem}
      onPress={setting.onPress}>
      <View style={[styles.settingIconContainer, {backgroundColor: `${colors.primary}15`}]}>
        <Ionicons name={setting.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, {color: colors.text}]}>{setting.title}</Text>
        {setting.subtitle && (
          <Text style={[styles.settingSubtitle, {color: colors.textMuted}]}>{setting.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert(
      'Esci dall\'account',
      'Sei sicuro di voler uscire dal tuo account?',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    // Guest users just logout
    if (isGuestUser) {
      Alert.alert(
        'Elimina Account Ospite',
        'Vuoi eliminare i dati del tuo account ospite?',
        [
          {text: 'Annulla', style: 'cancel'},
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAccount('');
              } catch (error: any) {
                Alert.alert('Errore', error.message);
              }
            },
          },
        ],
      );
      return;
    }

    // First confirmation
    Alert.alert(
      'Elimina Account',
      'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e perderai tutti i tuoi dati, crediti e biglietti.',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => {
            setPassword('');
            setShowDeletePassword(false);
            setShowPasswordModal(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (!password || password.trim() === '') {
      Alert.alert('Errore', 'Devi inserire la password per continuare');
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount(password);
      setShowPasswordModal(false);
      Alert.alert('Account Eliminato', 'Il tuo account è stato eliminato permanentemente.');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile eliminare l\'account');
    } finally {
      setDeletingAccount(false);
    }
  };

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
        <Text style={[styles.screenTitle, {color: colors.text}]}>Impostazioni</Text>
        <View style={styles.headerSpacer} />
      </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, styles.firstSectionTitle, {color: colors.textMuted}]}>Notifiche</Text>
        <Card style={styles.card} padding="none">
          {toggleSettings.map((setting, index) => (
            <View key={setting.id}>
              {renderToggleSetting(setting)}
              {index < toggleSettings.length - 1 && <View style={[styles.divider, {backgroundColor: colors.border}]} />}
            </View>
          ))}
        </Card>

        {/* General Section */}
        <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Generale</Text>
        <Card style={styles.card} padding="none">
          {linkSettings.map((setting, index) => (
            <View key={setting.id}>
              {renderLinkSetting(setting)}
              {index < linkSettings.length - 1 && <View style={[styles.divider, {backgroundColor: colors.border}]} />}
            </View>
          ))}
        </Card>

        {/* Account Actions */}
        <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Account</Text>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <View style={styles.logoutButtonInner}>
            <LinearGradient
              colors={[colors.primary, '#E55A00']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.actionButtonIconContainer}>
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionButtonText}>Esci dall'account</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteAccount}
          disabled={isLoading}
          activeOpacity={0.8}>
          <View style={[styles.deleteButtonInner, {backgroundColor: colors.card, borderColor: colors.error}]}>
            <View style={[styles.actionButtonIconContainer, styles.deleteIconContainer]}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </View>
            <Text style={[styles.deleteButtonText, {color: colors.error}]}>
              {isLoading ? 'Eliminazione...' : 'Elimina account'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.version, {color: colors.textMuted}]}>RaffleMania v1.0.0 (build 1)</Text>

      {/* Password Confirmation Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <View style={[styles.modalIconContainer, {backgroundColor: `${colors.error}15`}]}>
              <Ionicons name="warning" size={32} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Conferma Eliminazione</Text>
            <Text style={[styles.modalSubtitle, {color: colors.textMuted}]}>
              Inserisci la tua password per confermare l'eliminazione definitiva dell'account
            </Text>

            <View style={[styles.passwordInputContainer, {
              backgroundColor: colors.background,
              borderColor: colors.border,
            }]}>
              <TextInput
                ref={passwordRef}
                style={[styles.passwordInputField, {color: colors.text}]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showDeletePassword}
                value={password}
                onChangeText={setPassword}
                onChange={(e) => setPassword(e.nativeEvent.text)}
                autoCapitalize="none"
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none"
                editable={!deletingAccount}
              />
              <TouchableOpacity
                onPress={() => setShowDeletePassword(!showDeletePassword)}
                style={styles.eyeButton}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Ionicons
                  name={showDeletePassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, {borderColor: colors.border}]}
                onPress={() => setShowPasswordModal(false)}
                disabled={deletingAccount}>
                <Text style={[styles.modalButtonText, {color: colors.text}]}>Annulla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete, {backgroundColor: colors.error}]}
                onPress={handleConfirmDelete}
                disabled={deletingAccount}>
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>Elimina</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  firstSectionTitle: {
    marginTop: SPACING.md,
  },
  card: {
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionButton: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Platform.OS === 'ios' ? 56 : 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionButtonText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  deleteButton: {
    shadowColor: COLORS.error,
    shadowOpacity: 0.2,
  },
  deleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Platform.OS === 'ios' ? 56 : 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  deleteIconContainer: {
    backgroundColor: `${COLORS.error}15`,
  },
  deleteButtonText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  passwordInputContainer: {
    width: '100%',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  passwordInputField: {
    flex: 1,
    height: '100%',
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  passwordInput: {
    width: '100%',
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonDelete: {
    backgroundColor: COLORS.error,
  },
  modalButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default SettingsScreen;
