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
  LayoutAnimation,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground} from '../../components/common';
import {useTicketsStore, usePrizesStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {Ticket} from '../../types';
import {getTotalPoolTickets} from '../../services/mock';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';
import {formatDate} from '../../utils/formatters';

const {width} = Dimensions.get('window');

type TabType = 'active' | 'wins';

interface TicketsScreenProps {
  navigation: any;
}

// Interface for grouped tickets by prize
interface GroupedPrize {
  prizeId: string;
  prizeName: string;
  tickets: Ticket[];
  numbers: number[];
  totalPoolTickets: number;
}

// Animated Tab Component
const AnimatedTab: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeCount: number;
  winsCount: number;
}> = ({activeTab, onTabChange, activeCount, winsCount}) => {
  const {neon} = useThemeColors();
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
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeTab, slideAnim, colorAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (width - SPACING.lg * 2 - 8) / 2],
  });

  return (
    <View style={[styles.tabsContainer, neon.glowSubtle]}>
      <Animated.View
        style={[
          styles.tabIndicator,
          {transform: [{translateX}]},
        ]}>
        <LinearGradient
          colors={[COLORS.primary, '#FF8500']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.tabIndicatorGradient}
        />
      </Animated.View>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('active')}
        activeOpacity={0.7}>
        <Ionicons
          name="ticket"
          size={16}
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
        onPress={() => onTabChange('wins')}
        activeOpacity={0.7}>
        <Ionicons
          name="trophy"
          size={16}
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

// Prize Group Card - Shows prize with ticket count and expandable numbers
const PrizeGroupCard: React.FC<{
  group: GroupedPrize;
  index: number;
  onPressTicket: (ticketId: string) => void;
}> = ({group, index, onPressTicket: _onPressTicket}) => {
  const {colors, neon} = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(expandAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const rotateIcon = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.prizeGroupContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <View style={[styles.prizeGroupCard, neon.glowSubtle, {backgroundColor: colors.card}]}>
        {/* Header - Prize info and count */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleExpand}
          style={styles.prizeGroupHeader}>
          <View style={styles.prizeGroupLeft}>
            <View style={styles.prizeIconContainer}>
              <Ionicons name="gift" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.prizeGroupInfo}>
              <Text style={[styles.prizeGroupName, {color: colors.text}]} numberOfLines={1}>
                {group.prizeName}
              </Text>
              <Text style={[styles.prizeGroupSubtitle, {color: colors.text}]}>
                {group.numbers.length} {group.numbers.length === 1 ? 'numero' : 'numeri'} • {((group.numbers.length / group.totalPoolTickets) * 100).toFixed(2)}% chance
              </Text>
            </View>
          </View>

          <View style={styles.prizeGroupRight}>
            {/* Expand Arrow */}
            <Animated.View style={{transform: [{rotate: rotateIcon}]}}>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {/* Expandable Numbers List */}
        {expanded && (
          <View style={[styles.numbersContainer, {borderTopColor: colors.border}]}>
            <Text style={[styles.numbersTitle, {color: colors.textMuted}]}>I tuoi numeri:</Text>
            <Text style={styles.numbersListText}>
              {group.numbers.map((num, idx) => (
                <Text key={num}>
                  <Text style={styles.numberHighlight}>#{num}</Text>
                  {idx < group.numbers.length - 1 && <Text style={[styles.numberSeparator, {color: colors.textMuted}]}>  •  </Text>}
                </Text>
              ))}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Winning Ticket Card - Redesigned to match new system
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

export const TicketsScreen: React.FC<TicketsScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const {activeTickets, pastTickets, fetchTickets, getAdCooldownSeconds} = useTicketsStore();
  const {prizes} = usePrizesStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ad cooldown countdown
  useEffect(() => {
    const updateCooldown = () => {
      setCooldownSeconds(getAdCooldownSeconds());
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format ad cooldown in mm:ss
  const formatAdCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTabChange = (tab: TabType) => {
    // Animate content fade out, switch tab, fade in
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  // Group active tickets by prize
  const groupedPrizes: GroupedPrize[] = React.useMemo(() => {
    const prizeMap = new Map<string, GroupedPrize>();

    activeTickets.forEach(ticket => {
      const existing = prizeMap.get(ticket.prizeId);
      const prize = prizes.find(p => p.id === ticket.prizeId);

      if (existing) {
        existing.tickets.push(ticket);
        if (!existing.numbers.includes(ticket.ticketNumber)) {
          existing.numbers.push(ticket.ticketNumber);
        }
      } else {
        prizeMap.set(ticket.prizeId, {
          prizeId: ticket.prizeId,
          prizeName: prize?.name || 'Premio',
          tickets: [ticket],
          numbers: [ticket.ticketNumber],
          totalPoolTickets: getTotalPoolTickets(ticket.prizeId),
        });
      }
    });

    // Sort numbers in each group
    prizeMap.forEach(group => {
      group.numbers.sort((a, b) => a - b);
    });

    return Array.from(prizeMap.values());
  }, [activeTickets, prizes]);

  // Filter: only winning tickets in history
  const winningTickets = pastTickets.filter(t => t.isWinner);

  // Count unique prizes for active tab
  const uniquePrizesCount = groupedPrizes.length;

  const renderGroupedPrize = ({item, index}: {item: GroupedPrize; index: number}) => (
    <PrizeGroupCard
      group={item}
      index={index}
      onPressTicket={(ticketId) => navigation.navigate('TicketDetail', {ticketId})}
    />
  );

  const renderWinningTicket = ({item, index}: {item: Ticket; index: number}) => {
    const prize = prizes.find(p => p.id === item.prizeId);
    const prizeName = prize?.name || 'Premio';

    return (
      <WinningTicketCard
        ticket={item}
        prizeName={prizeName}
        index={index}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
      />
    );
  };

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    setTimeout(() => {
      setIsWatchingAd(false);
      navigation.navigate('Home');
    }, 500);
  };

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
      <AnimatedBackground />

      {/* Fixed Header with Banner and Tabs */}
      <View style={styles.fixedHeader}>
        {/* Banner Pubblicitario */}
        <View style={[styles.bannerContainer, {backgroundColor: colors.card}]}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIcon}>
              <Ionicons name="megaphone" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, {color: colors.text}]}>Il tuo brand qui!</Text>
              <Text style={[styles.bannerSubtitle, {color: colors.textMuted}]}>Sponsorizza la tua azienda</Text>
            </View>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>AD</Text>
            </View>
          </View>
        </View>

        <AnimatedTab
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeCount={uniquePrizesCount}
          winsCount={winningTickets.length}
        />
      </View>

      {/* Animated Content */}
      <Animated.View style={[styles.contentContainer, {opacity: contentOpacity}]}>
        {activeTab === 'active' ? (
          <FlatList
            data={groupedPrizes}
            renderItem={renderGroupedPrize}
            keyExtractor={item => item.prizeId}
            contentContainerStyle={styles.listContentNoHeader}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={renderEmpty}
          />
        ) : (
          <FlatList
            data={winningTickets}
            renderItem={renderWinningTicket}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContentNoHeader}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </Animated.View>

      {/* Bottom Watch Ad Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.watchAdButton, {backgroundColor: colors.card}, cooldownSeconds > 0 && styles.buttonDisabled]}
          onPress={handleWatchAd}
          disabled={isWatchingAd || cooldownSeconds > 0}
          activeOpacity={0.8}>
          <LinearGradient
            colors={cooldownSeconds === 0 ? [COLORS.primary, '#FF8500'] : ['#666', '#555']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.watchAdGradient}>
            <Ionicons name="play-circle" size={24} color={COLORS.white} />
            <Text style={styles.watchAdText}>
              {isWatchingAd ? 'GUARDANDO...' : cooldownSeconds > 0 ? `ATTENDI ${formatAdCooldown(cooldownSeconds)}` : 'GUARDA PUBBLICITÀ E GUADAGNA UN CREDITO'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: SPACING.xl + 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  fixedHeader: {
    paddingTop: SPACING.xl + 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  contentContainer: {
    flex: 1,
  },
  listContentNoHeader: {
    paddingTop: SPACING.sm,
    paddingBottom: 140,
    flexGrow: 1,
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
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
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
  },
  tabIndicatorGradient: {
    flex: 1,
    borderRadius: RADIUS.lg,
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
  // Prize Group Card
  prizeGroupContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  prizeGroupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  prizeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  prizeGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prizeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  prizeGroupInfo: {
    flex: 1,
  },
  prizeGroupName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  prizeGroupSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },
  prizeGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // Numbers Container
  numbersContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  numbersTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  numbersListText: {
    fontSize: FONT_SIZE.lg,
    lineHeight: 28,
    flexWrap: 'wrap',
  },
  numberHighlight: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  numberSeparator: {
    fontSize: FONT_SIZE.md,
  },
  // Winning Ticket Card - Redesigned
  winCardContainer: {
    paddingHorizontal: SPACING.lg,
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
    shadowColor: '#FF6B00',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
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
  // Banner
  bannerContainer: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  bannerBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bannerBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  watchAdButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  watchAdGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    minHeight: Platform.OS === 'ios' ? 56 : 48,
    gap: SPACING.sm,
  },
  watchAdText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    paddingHorizontal: SPACING.sm,
  },
});

export default TicketsScreen;
