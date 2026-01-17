import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useTicketsStore, usePrizesStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {Ticket} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
import {formatDate, formatTicketCode} from '../../utils/formatters';

interface MyWinsScreenProps {
  navigation: any;
}

const WinCard: React.FC<{
  ticket: Ticket;
  prizeName: string;
  prizeImage: string;
  index: number;
  onPress: () => void;
  colors: any;
}> = ({ticket, prizeName, prizeImage, index, onPress, colors}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        {/* Golden Border */}
        <LinearGradient
          colors={['#FFD700', '#FFA000', '#FF8C00']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.cardBorder}>
          <View style={styles.cardInner}>
            {/* Prize Image */}
            <View style={styles.imageContainer}>
              <Image
                source={{uri: prizeImage}}
                style={styles.prizeImage}
                resizeMode="contain"
              />
              <View style={styles.winBadge}>
                <Ionicons name="trophy" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Prize Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.winLabel}>HAI VINTO!</Text>
              <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={2}>
                {prizeName}
              </Text>
              <View style={styles.codeRow}>
                <Ionicons name="ticket" size={14} color={colors.textMuted} />
                <Text style={[styles.ticketCode, {color: colors.textMuted}]}>
                  {formatTicketCode(ticket.uniqueCode)}
                </Text>
              </View>
              <Text style={[styles.date, {color: colors.textMuted}]}>{formatDate(ticket.createdAt)}</Text>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={24} color="#FFA000" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MyWinsScreen: React.FC<MyWinsScreenProps> = ({navigation}) => {
  const {colors, neon} = useThemeColors();
  const {pastTickets, fetchTickets} = useTicketsStore();
  const {prizes} = usePrizesStore();

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter only winning tickets
  const winningTickets = pastTickets.filter(t => t.isWinner);

  const renderItem = ({item, index}: {item: Ticket; index: number}) => {
    const prize = prizes.find(p => p.id === item.prizeId);
    return (
      <WinCard
        ticket={item}
        prizeName={prize?.name || 'Premio'}
        prizeImage={prize?.imageUrl || 'https://via.placeholder.com/150'}
        index={index}
        colors={colors}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="trophy-outline" size={64} color="#FFD700" />
      </View>
      <Text style={[styles.emptyTitle, {color: colors.text}]}>Nessuna vincita ancora</Text>
      <Text style={[styles.emptySubtitle, {color: colors.textMuted}]}>
        Continua a partecipare alle estrazioni!{'\n'}La fortuna potrebbe essere dalla tua parte.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, neon.glow]}
        onPress={() => navigation.navigate('MainTabs', {screen: 'Home'})}>
        <LinearGradient
          colors={[colors.primary, '#FF8500']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.emptyButtonGradient}>
          <Ionicons name="play-circle" size={20} color={colors.white} />
          <Text style={styles.emptyButtonText}>Partecipa ora</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.statsCard, {backgroundColor: colors.card}]}>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={[styles.statValue, {color: colors.text}]}>{winningTickets.length}</Text>
          <Text style={[styles.statLabel, {color: colors.textMuted}]}>Premi vinti</Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={[styles.screenTitle, {color: colors.text}]}>Le Mie Vincite</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={winningTickets}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  cardContainer: {
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  cardBorder: {
    padding: 3,
    borderRadius: RADIUS.xl,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFEF5',
    borderRadius: RADIUS.xl - 2,
    padding: SPACING.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    position: 'relative',
  },
  prizeImage: {
    width: '90%',
    height: '90%',
  },
  winBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  infoContainer: {
    flex: 1,
  },
  winLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFA000',
    letterSpacing: 1,
    marginBottom: 4,
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ticketCode: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  date: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  emptyButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});

export default MyWinsScreen;
