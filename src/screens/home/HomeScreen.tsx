import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {ScreenContainer, Card, Button, Badge} from '../../components/common';
import {useAuthStore, useTicketsStore, usePrizesStore} from '../../store';
import {useCountdown} from '../../hooks/useCountdown';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
} from '../../utils/constants';
import {formatCurrency, padNumber} from '../../utils/formatters';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {user} = useAuthStore();
  const {activeTickets, fetchTickets, addTicket, canWatchAd, incrementAdsWatched, todayAdsWatched, maxAdsPerDay} =
    useTicketsStore();
  const {currentDraw, recentWinners, fetchDraws, fetchWinners} = usePrizesStore();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {countdown, isExpired} = useCountdown(currentDraw?.scheduledAt);

  useEffect(() => {
    fetchTickets();
    fetchDraws();
    fetchWinners();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTickets(), fetchDraws(), fetchWinners()]);
    setRefreshing(false);
  };

  const handleWatchAd = async () => {
    if (!canWatchAd()) {
      Alert.alert(
        'Limite raggiunto',
        `Hai raggiunto il limite di ${maxAdsPerDay} ads per oggi. Torna domani!`,
      );
      return;
    }

    setIsWatchingAd(true);

    // Simulate watching an ad
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (currentDraw) {
      const newTicket = addTicket('ad', currentDraw.id, currentDraw.prizeId);
      incrementAdsWatched();

      Alert.alert(
        'Biglietto Ottenuto!',
        `Codice: ${newTicket.uniqueCode}\n\nBuona fortuna per l'estrazione!`,
      );
    }

    setIsWatchingAd(false);
  };

  const prize = currentDraw?.prize;

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={handleRefresh}>
      {/* Header with user info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ciao, {user?.displayName}!</Text>
          <Text style={styles.subtitle}>Pronto a vincere?</Text>
        </View>
        <TouchableOpacity
          style={styles.creditsButton}
          onPress={() => navigation.navigate('Credits')}>
          <Text style={styles.creditsLabel}>Crediti</Text>
          <Text style={styles.creditsValue}>{user?.credits || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Current Prize Card */}
      {prize && (
        <Card style={styles.prizeCard} padding="none">
          <Image
            source={{uri: prize.imageUrl}}
            style={styles.prizeImage}
            resizeMode="cover"
          />
          <View style={styles.prizeContent}>
            <Badge text="Premio di Oggi" variant="primary" />
            <Text style={styles.prizeName}>{prize.name}</Text>
            <Text style={styles.prizeValue}>
              Valore: {formatCurrency(prize.value)}
            </Text>
          </View>
        </Card>
      )}

      {/* Countdown Timer */}
      <Card style={styles.countdownCard}>
        <Text style={styles.countdownLabel}>
          {isExpired ? 'Estrazione in corso...' : 'Prossima estrazione tra'}
        </Text>
        {!isExpired && (
          <View style={styles.countdownTimer}>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>
                {padNumber(countdown.hours)}
              </Text>
              <Text style={styles.countdownUnit}>ore</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>
                {padNumber(countdown.minutes)}
              </Text>
              <Text style={styles.countdownUnit}>min</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>
                {padNumber(countdown.seconds)}
              </Text>
              <Text style={styles.countdownUnit}>sec</Text>
            </View>
          </View>
        )}
        <Text style={styles.totalTickets}>
          {currentDraw?.totalTickets.toLocaleString()} biglietti in gioco
        </Text>
      </Card>

      {/* Watch Ad Button */}
      <Card style={styles.adCard}>
        <View style={styles.adHeader}>
          <Text style={styles.adTitle}>Ottieni un Biglietto</Text>
          <Text style={styles.adSubtitle}>
            Guarda una pubblicita e ricevi un biglietto per l'estrazione
          </Text>
        </View>

        <View style={styles.adProgress}>
          <Text style={styles.adProgressText}>
            Oggi: {todayAdsWatched}/{maxAdsPerDay} ads
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {width: `${(todayAdsWatched / maxAdsPerDay) * 100}%`},
              ]}
            />
          </View>
        </View>

        <Button
          title={isWatchingAd ? 'Guardando...' : 'Guarda Pubblicita'}
          onPress={handleWatchAd}
          loading={isWatchingAd}
          disabled={!canWatchAd() || isWatchingAd}
          fullWidth
          size="large"
        />

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Credits')}>
          <Text style={styles.skipText}>
            Oppure usa 5 crediti per saltare la pubblicita
          </Text>
        </TouchableOpacity>
      </Card>

      {/* My Tickets */}
      <Card
        style={styles.ticketsCard}
        onPress={() => navigation.navigate('Tickets')}>
        <View style={styles.ticketsHeader}>
          <Text style={styles.ticketsTitle}>I Tuoi Biglietti</Text>
          <Text style={styles.ticketsCount}>{activeTickets.length}</Text>
        </View>
        <Text style={styles.ticketsSubtitle}>
          per l'estrazione di oggi
        </Text>
      </Card>

      {/* Recent Winners */}
      <View style={styles.winnersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vincitori Recenti</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Winners')}>
            <Text style={styles.seeAll}>Vedi tutti</Text>
          </TouchableOpacity>
        </View>

        {recentWinners.slice(0, 3).map(winner => (
          <Card key={winner.id} style={styles.winnerCard} padding="small">
            <View style={styles.winnerRow}>
              <View style={styles.winnerAvatar}>
                <Text style={styles.winnerInitial}>
                  {winner.user?.displayName?.[0] || '?'}
                </Text>
              </View>
              <View style={styles.winnerInfo}>
                <Text style={styles.winnerName}>
                  {winner.user?.displayName || 'Utente'}
                </Text>
                <Text style={styles.winnerPrize}>
                  Ha vinto: {winner.prize?.name}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  creditsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  creditsLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.white,
    opacity: 0.8,
  },
  creditsValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  prizeCard: {
    marginBottom: SPACING.md,
  },
  prizeImage: {
    width: '100%',
    height: 180,
  },
  prizeContent: {
    padding: SPACING.md,
  },
  prizeName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  prizeValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  countdownCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  countdownLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  countdownTimer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  countdownNumber: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  countdownUnit: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  countdownSeparator: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginHorizontal: SPACING.xs,
  },
  totalTickets: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  adCard: {
    marginBottom: SPACING.md,
  },
  adHeader: {
    marginBottom: SPACING.md,
  },
  adTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  adSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  adProgress: {
    marginBottom: SPACING.md,
  },
  adProgressText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  skipButton: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
  },
  ticketsCard: {
    marginBottom: SPACING.lg,
  },
  ticketsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  ticketsCount: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  ticketsSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  winnersSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  seeAll: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  winnerCard: {
    marginBottom: SPACING.sm,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  winnerInitial: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  winnerPrize: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});

export default HomeScreen;
