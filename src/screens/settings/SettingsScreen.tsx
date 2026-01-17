import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ScreenContainer, Card} from '../../components/common';
import {useThemeColors} from '../../hooks/useThemeColors';
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
  const {colors, neon} = useThemeColors();
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: true,
    drawReminders: true,
    winNotifications: true,
  });

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
      id: 'wins',
      icon: 'trophy',
      title: 'Notifiche vincite',
      subtitle: 'Notifica immediatamente in caso di vincita',
      value: notifications.winNotifications,
    },
  ];

  const handleToggle = (id: string) => {
    setNotifications(prev => ({
      ...prev,
      [id === 'push' ? 'pushEnabled' :
       id === 'email' ? 'emailEnabled' :
       id === 'reminders' ? 'drawReminders' : 'winNotifications']:
       !prev[id === 'push' ? 'pushEnabled' :
             id === 'email' ? 'emailEnabled' :
             id === 'reminders' ? 'drawReminders' : 'winNotifications'],
    }));
  };

  const linkSettings: SettingLink[] = [
    {
      id: 'privacy',
      icon: 'shield-checkmark',
      title: 'Privacy Policy',
      onPress: () => Linking.openURL('https://rafflemania.app/privacy'),
    },
    {
      id: 'terms',
      icon: 'document-text',
      title: 'Termini di Servizio',
      onPress: () => Linking.openURL('https://rafflemania.app/terms'),
    },
    {
      id: 'support',
      icon: 'help-circle',
      title: 'Centro Assistenza',
      onPress: () => Alert.alert('Assistenza', 'Contattaci a support@rafflemania.app'),
    },
    {
      id: 'rate',
      icon: 'star',
      title: 'Valuta l\'app',
      subtitle: 'Lascia una recensione',
      onPress: () => Alert.alert('Grazie!', 'Apriremo lo store per la tua recensione.'),
    },
  ];

  const renderToggleSetting = (setting: SettingToggle) => (
    <View key={setting.id} style={styles.settingItem}>
      <View style={[styles.settingIconContainer, {backgroundColor: `${colors.primary}15`}, setting.value && neon.glowSubtle]}>
        <Ionicons name={setting.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, {color: colors.text}]}>{setting.title}</Text>
        <Text style={[styles.settingSubtitle, {color: colors.textMuted}]}>{setting.subtitle}</Text>
      </View>
      <Switch
        value={setting.value}
        onValueChange={() => handleToggle(setting.id)}
        trackColor={{false: colors.border, true: `${colors.primary}50`}}
        thumbColor={setting.value ? colors.primary : colors.textMuted}
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Elimina Account',
      'Sei sicuro di voler eliminare il tuo account? Questa azione e irreversibile.',
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => Alert.alert('Account', 'Funzionalita in arrivo'),
        },
      ],
    );
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

      <ScrollView showsVerticalScrollIndicator={false}>
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

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Account</Text>
        <Card style={styles.card} padding="none">
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDeleteAccount}>
            <View style={[styles.settingIconContainer, styles.dangerIcon]}>
              <Ionicons name="trash" size={20} color={colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, styles.dangerText, {color: colors.error}]}>
                Elimina account
              </Text>
              <Text style={[styles.settingSubtitle, {color: colors.textMuted}]}>
                Elimina permanentemente il tuo account
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* App Version */}
        <Text style={[styles.version, {color: colors.textMuted}]}>RaffleMania v1.0.0 (build 1)</Text>
      </ScrollView>
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
  dangerIcon: {
    backgroundColor: `${COLORS.error}15`,
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
  dangerText: {
    color: COLORS.error,
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
});

export default SettingsScreen;
