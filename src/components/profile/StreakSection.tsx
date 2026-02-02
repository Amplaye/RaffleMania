import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Card} from '../common';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useStreakStore, STREAK_REWARDS} from '../../store/useStreakStore';
import {useAuthStore} from '../../store/useAuthStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface StreakSectionProps {
  onStreakRecovered?: () => void;
}

export const StreakSection: React.FC<StreakSectionProps> = ({onStreakRecovered}) => {
  const {colors, neon} = useThemeColors();
  const {
    currentStreak,
    longestStreak,
    streakBroken,
    missedDays,
    checkAndUpdateStreak,
  } = useStreakStore();
  const user = useAuthStore(state => state.user);
  const refreshUserData = useAuthStore(state => state.refreshUserData);

  const [isRecovering, setIsRecovering] = useState(false);

  const recoveryCostPerDay = STREAK_REWARDS.RECOVERY_COST_PER_DAY;
  const totalRecoveryCost = missedDays * recoveryCostPerDay;
  const userCredits = user?.credits ?? 0;
  const canAffordRecovery = userCredits >= recoveryCostPerDay;

  // Recupera un singolo giorno
  const handleRecoverOneDay = async () => {
    if (!canAffordRecovery) {
      Alert.alert('Crediti insufficienti', `Hai bisogno di ${recoveryCostPerDay} crediti per recuperare un giorno.`);
      return;
    }

    setIsRecovering(true);

    try {
      // Deduce i crediti manualmente per un giorno
      const authStore = useAuthStore.getState();
      authStore.updateUser({
        credits: authStore.user!.credits - recoveryCostPerDay,
      });

      // Aggiorna lo stato dello streak
      const newMissedDays = missedDays - 1;

      if (newMissedDays <= 0) {
        // Tutti i giorni recuperati - imposta lastLoginDate a ieri
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;

        useStreakStore.setState({
          lastLoginDate: yesterdayStr,
          streakBroken: false,
          missedDays: 0,
          hasClaimedToday: false,
        });

        // Ora aggiorna lo streak per il giorno corrente
        const reward = await checkAndUpdateStreak();
        if (reward) {
          Alert.alert(
            'Streak Recuperata!',
            `Hai recuperato la tua streak! Ora sei al giorno ${currentStreak + 1}.`,
            [{text: 'OK'}]
          );
          onStreakRecovered?.();
        }
      } else {
        // Ancora giorni da recuperare
        useStreakStore.setState({
          missedDays: newMissedDays,
        });
        Alert.alert(
          'Giorno Recuperato!',
          `Hai recuperato 1 giorno. Rimangono ${newMissedDays} giorni da recuperare.`,
          [{text: 'OK'}]
        );
      }

      refreshUserData();
    } catch {
      Alert.alert('Errore', 'Impossibile recuperare il giorno.');
    } finally {
      setIsRecovering(false);
    }
  };

  // Calcola il giorno nella settimana corrente (1-7)
  const dayInWeek = currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 0;
  const daysUntilBonus = 7 - dayInWeek;

  return (
    <Card style={[styles.container, neon.glowSubtle]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={streakBroken ? ['#E53935', '#C62828'] : [COLORS.primary, '#FF8500']}
            style={styles.iconGradient}
          >
            <Ionicons name="flame" size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.title, {color: colors.text}]}>Login Streak</Text>
            <Text style={[styles.subtitle, {color: colors.textMuted}]}>
              {streakBroken ? 'Streak interrotta!' : 'Accedi ogni giorno per bonus'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, {backgroundColor: colors.background}]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: streakBroken ? '#E53935' : COLORS.primary}]}>
            {currentStreak}
          </Text>
          <Text style={[styles.statLabel, {color: colors.textMuted}]}>Streak Attuale</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: COLORS.primary}]}>{longestStreak}</Text>
          <Text style={[styles.statLabel, {color: colors.textMuted}]}>Record</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: '#00B894'}]}>
            {daysUntilBonus > 0 ? daysUntilBonus : 7}
          </Text>
          <Text style={[styles.statLabel, {color: colors.textMuted}]}>Al Bonus</Text>
        </View>
      </View>

      {/* Streak Broken - Recovery Section */}
      {streakBroken && missedDays > 0 && (
        <View style={[styles.recoverySection, {backgroundColor: 'rgba(229, 57, 53, 0.1)'}]}>
          <View style={styles.recoveryHeader}>
            <Ionicons name="warning" size={20} color="#E53935" />
            <Text style={[styles.recoveryTitle, {color: '#E53935'}]}>
              {missedDays} giorn{missedDays === 1 ? 'o' : 'i'} pers{missedDays === 1 ? 'o' : 'i'}!
            </Text>
          </View>

          <Text style={[styles.recoveryDescription, {color: colors.textSecondary}]}>
            Recupera i giorni persi per mantenere la tua streak di {currentStreak} giorni.
            Costo: {recoveryCostPerDay} crediti per giorno.
          </Text>

          {/* Missed Days Visual */}
          <View style={styles.missedDaysContainer}>
            {Array.from({length: Math.min(missedDays, 7)}).map((_, index) => (
              <View
                key={index}
                style={[styles.missedDayBox, {backgroundColor: 'rgba(229, 57, 53, 0.2)'}]}
              >
                <Ionicons name="close" size={16} color="#E53935" />
                <Text style={styles.missedDayText}>Giorno {index + 1}</Text>
              </View>
            ))}
            {missedDays > 7 && (
              <View style={[styles.missedDayBox, {backgroundColor: 'rgba(229, 57, 53, 0.2)'}]}>
                <Text style={styles.missedDayText}>+{missedDays - 7}</Text>
              </View>
            )}
          </View>

          {/* Recovery Cost Info */}
          <View style={[styles.costInfo, {backgroundColor: colors.background}]}>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, {color: colors.textSecondary}]}>
                Costo per 1 giorno:
              </Text>
              <View style={styles.costValue}>
                <Ionicons name="wallet" size={16} color={COLORS.primary} />
                <Text style={[styles.costAmount, {color: COLORS.primary}]}>
                  {recoveryCostPerDay} crediti
                </Text>
              </View>
            </View>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, {color: colors.textSecondary}]}>
                Totale per tutti:
              </Text>
              <View style={styles.costValue}>
                <Ionicons name="wallet" size={16} color={COLORS.primary} />
                <Text style={[styles.costAmount, {color: COLORS.primary}]}>
                  {totalRecoveryCost} crediti
                </Text>
              </View>
            </View>
            <View style={[styles.balanceRow, {borderTopColor: colors.border}]}>
              <Text style={[styles.costLabel, {color: colors.textSecondary}]}>
                I tuoi crediti:
              </Text>
              <Text style={[styles.balanceAmount, {color: canAffordRecovery ? '#00B894' : '#E53935'}]}>
                {userCredits}
              </Text>
            </View>
          </View>

          {/* Recover Button */}
          <TouchableOpacity
            style={[styles.recoverButton, !canAffordRecovery && styles.buttonDisabled]}
            onPress={handleRecoverOneDay}
            disabled={!canAffordRecovery || isRecovering}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canAffordRecovery ? ['#00B894', '#00a884'] : ['#666', '#555']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.recoverButtonGradient}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.recoverButtonText}>
                {isRecovering
                  ? 'RECUPERO...'
                  : canAffordRecovery
                    ? `RECUPERA 1 GIORNO (${recoveryCostPerDay} crediti)`
                    : 'CREDITI INSUFFICIENTI'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Streak Active Info */}
      {!streakBroken && currentStreak > 0 && (
        <View style={[styles.activeStreakInfo, {backgroundColor: 'rgba(0, 184, 148, 0.1)'}]}>
          <Ionicons name="checkmark-circle" size={20} color="#00B894" />
          <Text style={[styles.activeStreakText, {color: '#00B894'}]}>
            La tua streak è attiva! Continua così!
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginHorizontal: SPACING.sm,
  },
  recoverySection: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  recoveryTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  recoveryDescription: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  missedDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  missedDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  missedDayText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: '#E53935',
  },
  costInfo: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  costLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  costValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costAmount: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  balanceAmount: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  recoverButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  recoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 8,
  },
  recoverButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#fff',
  },
  activeStreakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  activeStreakText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default StreakSection;
