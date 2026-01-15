import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {ScreenContainer, Card} from '../../components/common';
import {useAuthStore} from '../../store';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
} from '../../utils/constants';

interface ProfileScreenProps {
  navigation: any;
}

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {user, logout} = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Esci', 'Sei sicuro di voler uscire?', [
      {text: 'Annulla', style: 'cancel'},
      {
        text: 'Esci',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'credits',
      icon: '💎',
      title: 'I Miei Crediti',
      subtitle: `${user?.credits || 0} crediti disponibili`,
      onPress: () => navigation.navigate('Credits'),
    },
    {
      id: 'wins',
      icon: '🏆',
      title: 'Le Mie Vincite',
      subtitle: 'Storico premi vinti',
      onPress: () => navigation.navigate('MyWins'),
    },
    {
      id: 'referral',
      icon: '🎁',
      title: 'Invita Amici',
      subtitle: `Codice: ${user?.referralCode || 'N/A'}`,
      onPress: () => navigation.navigate('Referral'),
    },
    {
      id: 'address',
      icon: '📍',
      title: 'Indirizzo di Spedizione',
      subtitle: user?.shippingAddress ? 'Configurato' : 'Non configurato',
      onPress: () => navigation.navigate('AddressForm'),
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Impostazioni',
      subtitle: 'Notifiche, privacy',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}>
      <Text style={styles.menuIcon}>{item.icon}</Text>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || 'Utente'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.totalTickets || 0}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.watchedAdsCount || 0}</Text>
            <Text style={styles.statLabel}>Ads Viste</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.credits || 0}</Text>
            <Text style={styles.statLabel}>Crediti</Text>
          </View>
        </View>
      </Card>

      {/* Menu Items */}
      <Card style={styles.menuCard} padding="none">
        {menuItems.map(renderMenuItem)}
      </Card>

      {/* Support */}
      <Card style={styles.supportCard}>
        <TouchableOpacity
          style={styles.supportItem}
          onPress={() => Alert.alert('Aiuto', 'Funzionalita in arrivo!')}>
          <Text style={styles.supportIcon}>❓</Text>
          <Text style={styles.supportText}>Centro Assistenza</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.supportItem}
          onPress={() => Alert.alert('Feedback', 'Funzionalita in arrivo!')}>
          <Text style={styles.supportIcon}>💬</Text>
          <Text style={styles.supportText}>Invia Feedback</Text>
        </TouchableOpacity>
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Esci dall'account</Text>
      </TouchableOpacity>

      <Text style={styles.version}>RaffleMania v1.0.0</Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    fontSize: 24,
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
  menuArrow: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textLight,
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
  },
  supportIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  supportText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  logoutText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.medium,
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
