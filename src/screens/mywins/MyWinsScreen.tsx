import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ScreenContainer} from '../../components/common';
import {useTicketsStore, usePrizesStore} from '../../store';
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
import {formatDate, formatTicketNumber} from '../../utils/formatters';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

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
  isDark: boolean;
}> = ({ticket, prizeName, prizeImage, index, onPress, colors, isDark}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Shimmer effect for premium feel
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start();
  }, [index, scaleAnim, opacityAnim, shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

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
        {/* Golden Border with enhanced glow */}
        <LinearGradient
          colors={['#FFD700', '#FFA000', '#FF8C00', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.cardBorder}>
          <View style={[styles.cardInner, {backgroundColor: isDark ? '#1A1A1A' : '#FFFEF5'}]}>
            {/* Shimmer overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{translateX: shimmerTranslate}],
                },
              ]}
            />

            {/* Prize Image */}
            <View style={styles.imageContainer}>
              <LinearGradient
                colors={isDark ? ['#2A2A2A', '#1A1A1A'] : ['#FFFFFF', '#F8F8F8']}
                style={styles.imageBackground}>
                <Image
                  source={{uri: prizeImage}}
                  style={styles.prizeImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>

            {/* Prize Info */}
            <View style={styles.infoContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA000']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.winLabelBadge}>
                <Ionicons name="star" size={10} color="#FFFFFF" />
                <Text style={styles.winLabel}>VINCITA</Text>
                <Ionicons name="star" size={10} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={2}>
                {prizeName}
              </Text>
              <View style={styles.codeRow}>
                <Ionicons name="ticket" size={14} color="#FFA000" />
                <Text style={[styles.ticketCode, {color: colors.textMuted}]}>
                  Numero vincente: {formatTicketNumber(ticket.ticketNumber)}
                </Text>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.date, {color: colors.textMuted}]}>{formatDate(ticket.createdAt)}</Text>
              </View>
            </View>

            {/* Arrow with glow */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color="#FFA000" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MyWinsScreen: React.FC<MyWinsScreenProps> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const {pastTickets, fetchTickets} = useTicketsStore();
  const {prizes} = usePrizesStore();
  const headerScaleAnim = useRef(new Animated.Value(0.9)).current;
  const headerOpacityAnim = useRef(new Animated.Value(0)).current;
  const trophyRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTickets();

    // Header entrance animation
    Animated.parallel([
      Animated.spring(headerScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Trophy wiggle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotateAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotateAnim, {
          toValue: -1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotateAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ]),
    ).start();
  }, [fetchTickets, headerScaleAnim, headerOpacityAnim, trophyRotateAnim]);

  // Filter only winning tickets
  const winningTickets = pastTickets.filter(t => t.isWinner);

  const trophyRotate = trophyRotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const renderItem = ({item, index}: {item: Ticket; index: number}) => {
    const prize = prizes.find(p => p.id === item.prizeId);
    // Use stored prize info from ticket (for new wins) or fall back to prizes lookup
    const displayPrizeName = item.prizeName || prize?.name || 'Premio';
    const displayPrizeImage = item.prizeImage || prize?.imageUrl || 'https://via.placeholder.com/150';
    return (
      <WinCard
        ticket={item}
        prizeName={displayPrizeName}
        prizeImage={displayPrizeImage}
        index={index}
        colors={colors}
        isDark={isDark}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.05)']}
        style={styles.emptyIconContainer}>
        <Animated.View style={{transform: [{rotate: trophyRotate}]}}>
          <Ionicons name="trophy-outline" size={64} color="#FFD700" />
        </Animated.View>
      </LinearGradient>
      <Text style={[styles.emptyTitle, {color: colors.text}]}>Nessuna vincita ancora</Text>
      <Text style={[styles.emptySubtitle, {color: colors.textMuted}]}>
        Continua a partecipare alle estrazioni!{'\n'}La fortuna potrebbe essere dalla tua parte.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('MainTabs', {screen: 'Home'})}>
        <LinearGradient
          colors={[colors.primary, '#FF8500']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.emptyButtonGradient}>
          <Ionicons name="play-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Partecipa ora</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: headerOpacityAnim,
          transform: [{scale: headerScaleAnim}],
        },
      ]}>
      <LinearGradient
        colors={isDark ? ['#2A2A2A', '#1A1A1A'] : ['#FFFEF5', '#FFF8E7']}
        style={[styles.statsCard, styles.statsCardShadow]}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
          style={styles.trophyIconContainer}>
          <Animated.View style={{transform: [{rotate: trophyRotate}]}}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
          </Animated.View>
        </LinearGradient>
        <View style={styles.statsTextContainer}>
          <Text style={[styles.statValue, {color: colors.text}]}>{winningTickets.length}</Text>
          <Text style={[styles.statLabel, {color: colors.textMuted}]}>
            {winningTickets.length === 1 ? 'Premio vinto' : 'Premi vinti'}
          </Text>
        </View>
        {winningTickets.length > 0 && (
          <View style={styles.celebrationBadge}>
            <Ionicons name="sparkles" size={16} color="#FFD700" />
          </View>
        )}
      </LinearGradient>

      {winningTickets.length > 0 && (
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Tocca una vincita per vedere i dettagli
        </Text>
      )}
    </Animated.View>
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
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  statsCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statsCardShadow: {
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  trophyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  statsTextContainer: {
    alignItems: 'flex-start',
  },
  celebrationBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  statValue: {
    fontSize: 42,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    lineHeight: 48,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  cardContainer: {
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBorder: {
    padding: 3,
    borderRadius: RADIUS.xl,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl - 2,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{skewX: '-20deg'}],
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImage: {
    width: '85%',
    height: '85%',
  },
  infoContainer: {
    flex: 1,
  },
  winLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    marginBottom: 6,
  },
  winLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  prizeName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ticketCode: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
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
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
