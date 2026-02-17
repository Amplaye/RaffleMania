import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useTicketsStore, usePrizesStore, useAuthStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {Ticket} from '../../types';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
  COLORS,
} from '../../utils/constants';
import {formatDate} from '../../utils/formatters';

interface MyWinsScreenProps {
  navigation: any;
}

// Winning Ticket Card - Same style as TicketsScreen
const WinningTicketCard: React.FC<{
  ticket: Ticket;
  prizeName: string;
  index: number;
  onPress: () => void;
}> = ({ticket, prizeName, index, onPress}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.winCardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={['#FFB347', '#FF9636', '#FF7F24']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.winCardGradient}>
          <View style={styles.winCardContent}>
            {/* Left: Trophy Icon */}
            <View style={styles.winTrophyContainer}>
              <Ionicons name="trophy" size={32} color="#FFFFFF" />
            </View>

            {/* Center: Info */}
            <View style={styles.winInfoSection}>
              <Text style={styles.winPrizeName} numberOfLines={1}>{prizeName}</Text>
              <Text style={styles.winSubtitle}>
                Numero vincente: <Text style={styles.winNumberHighlight}>#{ticket.ticketNumber}</Text>
              </Text>
              <Text style={styles.winDate}>{formatDate(ticket.wonAt || ticket.createdAt)}</Text>
            </View>

            {/* Right: Arrow */}
            <View style={styles.winArrowContainer}>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MyWinsScreen: React.FC<MyWinsScreenProps> = ({navigation}) => {
  const {colors} = useThemeColors();
  const {pastTickets, forceRefreshTickets} = useTicketsStore();
  const {prizes, myWins, fetchMyWins} = usePrizesStore();
  const user = useAuthStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Force refresh to get latest winning tickets from server
    forceRefreshTickets();
    if (user?.id) {
      fetchMyWins(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter only winning tickets
  const winningTickets = pastTickets.filter(t => t.isWinner);

  const handleRefresh = async () => {
    setRefreshing(true);
    await forceRefreshTickets();
    if (user?.id) {
      await fetchMyWins(user.id);
    }
    setRefreshing(false);
  };

  const renderItem = ({item, index}: {item: Ticket; index: number}) => {
    const prize = prizes.find(p => p.id === item.prizeId);
    // Also check myWins for prize name (most reliable for completed prizes)
    const winRecord = myWins.find(w => w.ticketId === item.id)
      || myWins.find(w => w.prizeId === item.prizeId);
    const displayPrizeName = item.prizeName || prize?.name || winRecord?.prize?.name || 'Premio';

    return (
      <WinningTicketCard
        ticket={item}
        prizeName={displayPrizeName}
        index={index}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, {backgroundColor: colors.card}]}>
        <Ionicons name="trophy-outline" size={48} color="#FFD700" />
      </View>
      <Text style={[styles.emptyTitle, {color: colors.text}]}>
        Nessuna vincita ancora
      </Text>
      <Text style={[styles.emptySubtitle, {color: colors.textMuted}]}>
        Le tue vincite appariranno qui. Continua a partecipare!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('MainTabs', {screen: 'Home'})}>
        <Ionicons name="play-circle" size={20} color={COLORS.white} />
        <Text style={styles.emptyButtonText}>Guarda Ads</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    winningTickets.length > 0 ? (
      <Text style={[styles.sectionTitle, {color: colors.text}]}>
        Storico Vincite ({winningTickets.length})
      </Text>
    ) : null
  );

  return (
    <ScreenContainer scrollable={false} padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, {borderColor: colors.primary}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Le Mie Vincite</Text>
        <View style={{width: 40}} />
      </View>

      <FlatList
        data={winningTickets}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  // Winning Ticket Card - Same style as TicketsScreen
  winCardContainer: {
    marginBottom: SPACING.md,
  },
  winCardGradient: {
    borderRadius: RADIUS.xl,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  winCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  winTrophyContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  winInfoSection: {
    flex: 1,
  },
  winPrizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  winSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  winNumberHighlight: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
  },
  winDate: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  winArrowContainer: {
    marginLeft: SPACING.sm,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});

export default MyWinsScreen;
