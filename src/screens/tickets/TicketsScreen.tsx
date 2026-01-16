import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

const {width} = Dimensions.get('window');

type TabType = 'active' | 'wins';

interface TicketsScreenProps {
  navigation: any;
}

// Animated Tab Component
const AnimatedTab: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeCount: number;
  winsCount: number;
}> = ({activeTab, onTabChange, activeCount, winsCount}) => {
  const slideAnim = useRef(new Animated.Value(activeTab === 'active' ? 0 : 1)).current;
  const colorAnim = useRef(new Animated.Value(activeTab === 'active' ? 0 : 1)).current;

  useEffect(() => {
    const toValue = activeTab === 'active' ? 0 : 1;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(colorAnim, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, slideAnim, colorAnim]);

  // Calculate the exact width of each tab for proper animation
  const tabWidth = (width - SPACING.lg * 2 - 8) / 2;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  // Opacity for color transition between two gradients
  const winsOpacity = colorAnim;
  const activeOpacity = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.tabsContainer}>
      <Animated.View
        style={[
          styles.tabIndicator,
          {transform: [{translateX}]},
        ]}>
        {/* Active gradient (orange) */}
        <Animated.View style={[styles.tabIndicatorGradient, {opacity: activeOpacity}]}>
          <LinearGradient
            colors={[COLORS.primary, '#FF8500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.tabIndicatorGradient}
          />
        </Animated.View>
        {/* Wins gradient (gold) */}
        <Animated.View style={[styles.tabIndicatorGradient, styles.tabIndicatorOverlay, {opacity: winsOpacity}]}>
          <LinearGradient
            colors={['#FFD700', '#FFA000']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.tabIndicatorGradient}
          />
        </Animated.View>
      </Animated.View>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('active')}>
        <Ionicons
          name={activeTab === 'active' ? 'ticket' : 'ticket-outline'}
          size={18}
          color={activeTab === 'active' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'active' && styles.activeTabText,
          ]}>
          Attivi ({activeCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('wins')}>
        <Ionicons
          name={activeTab === 'wins' ? 'trophy' : 'trophy-outline'}
          size={18}
          color={activeTab === 'wins' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'wins' && styles.activeTabText,
          ]}>
          Vincite ({winsCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Active Ticket Card - Simple design
const ActiveTicketCard: React.FC<{
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
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.activeCardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.activeCard}>
        <View style={styles.activeCardLeft}>
          <View style={styles.ticketIconContainer}>
            <Ionicons name="ticket" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.activeCardInfo}>
            <Text style={styles.activeCardCode}>{formatTicketCode(ticket.uniqueCode)}</Text>
            <Text style={styles.activeCardPrize} numberOfLines={1}>{prizeName}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Winning Ticket Card - Special golden design with emphasis
const WinningTicketCard: React.FC<{
  ticket: Ticket;
  prizeName: string;
  index: number;
  onPress: () => void;
}> = ({ticket, prizeName, index, onPress}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.winCardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.winCard}>
        {/* Golden Glow Background */}
        <Animated.View style={[styles.winCardGlow, {opacity: glowOpacity}]} />

        {/* Golden Border */}
        <LinearGradient
          colors={['#FFD700', '#FFA000', '#FF8C00']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.winCardBorder}>
          <View style={styles.winCardInner}>
            {/* Trophy Badge */}
            <View style={styles.trophyContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA000']}
                style={styles.trophyBadge}>
                <Ionicons name="trophy" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Win Info */}
            <View style={styles.winInfo}>
              <Text style={styles.winLabel}>HAI VINTO!</Text>
              <Text style={styles.winPrizeName} numberOfLines={2}>{prizeName}</Text>
              <View style={styles.winCodeContainer}>
                <Text style={styles.winCodeLabel}>Codice:</Text>
                <Text style={styles.winCode}>{formatTicketCode(ticket.uniqueCode)}</Text>
              </View>
              <Text style={styles.winDate}>{formatDate(ticket.createdAt)}</Text>
            </View>

            {/* Arrow */}
            <View style={styles.winArrow}>
              <Ionicons name="chevron-forward" size={24} color="#FFA000" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const TicketsScreen: React.FC<TicketsScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const {activeTickets, pastTickets, fetchTickets} = useTicketsStore();
  const {prizes} = usePrizesStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  // Filter: only winning tickets in history
  const winningTickets = pastTickets.filter(t => t.isWinner);

  // Get tickets based on active tab
  const tickets = activeTab === 'active' ? activeTickets : winningTickets;

  const renderTicket = ({item, index}: {item: Ticket; index: number}) => {
    const prize = prizes.find(p => p.id === item.prizeId);
    const prizeName = prize?.name || 'Premio';

    if (activeTab === 'wins') {
      return (
        <WinningTicketCard
          ticket={item}
          prizeName={prizeName}
          index={index}
          onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
        />
      );
    }

    return (
      <ActiveTicketCard
        ticket={item}
        prizeName={prizeName}
        index={index}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleSection}>
        <Text style={[styles.title, {color: colors.text}]}>I Miei Biglietti</Text>
        <Text style={[styles.subtitle, {color: colors.textMuted}]}>
          I biglietti scaduti vengono rimossi automaticamente
        </Text>
      </View>

      <AnimatedTab
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={activeTickets.length}
        winsCount={winningTickets.length}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, {backgroundColor: colors.card}]}>
        {activeTab === 'active' ? (
          <Ionicons name="ticket-outline" size={48} color={colors.border} />
        ) : (
          <Ionicons name="trophy-outline" size={48} color="#FFD700" />
        )}
      </View>
      <Text style={[styles.emptyTitle, {color: colors.text}]}>
        {activeTab === 'active' ? 'Nessun biglietto attivo' : 'Nessuna vincita ancora'}
      </Text>
      <Text style={[styles.emptySubtitle, {color: colors.textMuted}]}>
        {activeTab === 'active'
          ? 'Guarda una pubblicità per ottenere il tuo primo biglietto!'
          : 'Le tue vincite appariranno qui. Continua a partecipare!'}
      </Text>
      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Home')}>
          <Ionicons name="play-circle" size={20} color={COLORS.white} />
          <Text style={styles.emptyButtonText}>Guarda Ads</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: SPACING.xl + 30,
    paddingBottom: 140,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  titleSection: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: (width - SPACING.lg * 2 - 8) / 2,
    height: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  tabIndicatorGradient: {
    flex: 1,
    borderRadius: RADIUS.lg,
  },
  tabIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },
  // Active Ticket Card - Simple
  activeCardContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ticketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  activeCardInfo: {
    flex: 1,
  },
  activeCardCode: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: 1,
  },
  activeCardPrize: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Winning Ticket Card - Special Golden Design
  winCardContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  winCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  winCardGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#FFD700',
    borderRadius: RADIUS.xl + 10,
  },
  winCardBorder: {
    padding: 3,
    borderRadius: RADIUS.xl,
  },
  winCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFEF5',
    borderRadius: RADIUS.xl - 2,
    padding: SPACING.lg,
  },
  trophyContainer: {
    marginRight: SPACING.md,
  },
  trophyBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  winInfo: {
    flex: 1,
  },
  winLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFA000',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  winPrizeName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  winCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  winCodeLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  winCode: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFA000',
    letterSpacing: 1,
  },
  winDate: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
  },
  winArrow: {
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
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

export default TicketsScreen;
