import React, {useEffect, useRef, useMemo, useCallback, memo} from 'react';
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
import {useLeaderboardStore, useAuthStore, usePrizesStore, useLevelStore, useAvatarStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {LeaderboardEntry, LeaderboardType} from '../../types';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
  COLORS,
} from '../../utils/constants';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Animated Tab Component (same style as TicketsScreen)
const AnimatedTab: React.FC<{
  activeTab: LeaderboardType;
  onTabChange: (tab: LeaderboardType) => void;
}> = ({activeTab, onTabChange}) => {
  const {neon} = useThemeColors();
  const slideAnim = useRef(new Animated.Value(activeTab === 'ads' ? 0 : 1)).current;

  useEffect(() => {
    const toValue = activeTab === 'ads' ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [activeTab, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - SPACING.md * 2 - 8) / 2],
  });

  return (
    <View style={[styles.animatedTabsContainer, neon.glowSubtle]}>
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
        style={styles.animatedTab}
        onPress={() => onTabChange('ads')}
        activeOpacity={0.7}>
        <Ionicons
          name="play-circle"
          size={16}
          color={activeTab === 'ads' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.animatedTabText,
            activeTab === 'ads' && styles.activeAnimatedTabText,
          ]}>
          Ads Visti
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.animatedTab}
        onPress={() => onTabChange('wins')}
        activeOpacity={0.7}>
        <Ionicons
          name="trophy"
          size={16}
          color={activeTab === 'wins' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.animatedTabText,
            activeTab === 'wins' && styles.activeAnimatedTabText,
          ]}>
          Vincite
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface LeaderboardScreenProps {
  navigation: any;
}

// Podium component for top 3 - memoized for smooth tab switching
const Podium = memo<{
  entries: LeaderboardEntry[];
  type: LeaderboardType;
  colors: any;
  isDark: boolean;
}>(({entries, type, colors, isDark: _isDark}) => {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return ['#FFD700', '#FFA000'];
      case 2: return ['#C0C0C0', '#A0A0A0'];
      case 3: return ['#CD7F32', '#8B4513'];
      default: return [colors.primary, colors.primaryDark];
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1: return 'trophy';
      case 2: return 'medal';
      case 3: return 'medal-outline';
      default: return 'ribbon';
    }
  };

  const PodiumItem: React.FC<{
    entry: LeaderboardEntry | undefined;
    rank: number;
    height: number;
  }> = ({entry, rank, height}) => {
    if (!entry) return <View style={{width: 100}} />;

    const medalColors = getMedalColor(rank);
    const isCurrentUser = entry.isCurrentUser;

    return (
      <View style={[styles.podiumItem, {height: height + 80}]}>
        {/* Avatar */}
        <View style={[
          styles.podiumAvatarContainer,
          isCurrentUser && styles.currentUserBorder,
        ]}>
          {entry.avatarUrl ? (
            <Image source={{uri: entry.avatarUrl}} style={styles.podiumAvatar} />
          ) : (
            <LinearGradient
              colors={medalColors}
              style={styles.podiumAvatarPlaceholder}>
              <Text style={styles.podiumAvatarText}>
                {entry.displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {/* Medal badge */}
          <LinearGradient
            colors={medalColors}
            style={styles.medalBadge}>
            <Ionicons name={getMedalIcon(rank)} size={12} color="#FFF" />
          </LinearGradient>
        </View>

        {/* Name */}
        <Text
          style={[
            styles.podiumName,
            {color: isCurrentUser ? colors.primary : colors.text},
          ]}
          numberOfLines={1}>
          {entry.displayName.split(' ')[0]}
        </Text>

        {/* Value */}
        <View style={styles.podiumValueContainer}>
          <Ionicons
            name={type === 'ads' ? 'play-circle' : 'trophy'}
            size={12}
            color={medalColors[0]}
          />
          <Text style={[styles.podiumValue, {color: colors.text}]}>
            {entry.value.toLocaleString()}
          </Text>
        </View>

        {/* Podium base */}
        <LinearGradient
          colors={medalColors}
          style={[styles.podiumBase, {height}]}>
          <Text style={styles.podiumRank}>{rank}</Text>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.podiumContainer}>
      <PodiumItem entry={second} rank={2} height={60} />
      <PodiumItem entry={first} rank={1} height={80} />
      <PodiumItem entry={third} rank={3} height={40} />
    </View>
  );
});

// Leaderboard entry row - memoized for smooth tab switching
const LeaderboardRow = memo<{
  entry: LeaderboardEntry;
  type: LeaderboardType;
  index: number;
  colors: any;
  isDark: boolean;
}>(({entry, type, index: _index, colors, isDark}) => {
  const isCurrentUser = entry.isCurrentUser;

  return (
    <View style={styles.rowContainer}>
      <View
        style={[
          styles.row,
          {backgroundColor: isDark ? colors.card : '#FFFFFF'},
          isCurrentUser && styles.currentUserRow,
          isCurrentUser && {borderColor: colors.primary},
        ]}>
        {/* Rank */}
        <View style={[styles.rankContainer, isCurrentUser && {backgroundColor: colors.primary}]}>
          <Text style={[styles.rankText, isCurrentUser && {color: '#FFF'}]}>
            {entry.rank}
          </Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {entry.avatarUrl ? (
            <Image source={{uri: entry.avatarUrl}} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {entry.displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {/* Level badge */}
          <View style={[styles.levelBadge, {backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'}]}>
            <Text style={[styles.levelText, {color: colors.primary}]}>
              {entry.level}
            </Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.nameContainer}>
          <Text
            style={[
              styles.name,
              {color: isCurrentUser ? colors.primary : colors.text},
              isCurrentUser && styles.currentUserName,
            ]}
            numberOfLines={1}>
            {entry.displayName}
            {isCurrentUser && ' (Tu)'}
          </Text>
        </View>

        {/* Value */}
        <View style={styles.valueContainer}>
          <Ionicons
            name={type === 'ads' ? 'play-circle' : 'trophy'}
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.value, {color: colors.text}]}>
            {entry.value.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
});

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const user = useAuthStore(state => state.user);
  const {myWins} = usePrizesStore();
  const {level} = useLevelStore();
  const {customPhotoUri} = useAvatarStore();
  const {
    adsLeaderboard,
    winsLeaderboard,
    isLoading,
    activeTab,
    currentUserAdsRank,
    currentUserWinsRank,
    fetchLeaderboards,
    setActiveTab,
    startMidnightCheck,
    stopMidnightCheck,
    debugSetUserRank,
    debugResetUserRank,
  } = useLeaderboardStore();

  // User stats
  const userAdsCount = user?.watchedAdsCount || 0;
  const userWinsCount = myWins.length;
  // User avatar - use custom photo if available
  const userAvatarUrl = customPhotoUri || undefined;

  // Fetch data on mount and start midnight check
  useEffect(() => {
    fetchLeaderboards(
      user?.id,
      userAdsCount,
      userWinsCount,
      level,
      user?.displayName,
      userAvatarUrl,
    );

    startMidnightCheck(
      user?.id,
      userAdsCount,
      userWinsCount,
      level,
      user?.displayName,
      userAvatarUrl,
    );

    return () => {
      stopMidnightCheck();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userAdsCount, userWinsCount, level, user?.displayName, userAvatarUrl]);

  // Memoize leaderboard data to prevent unnecessary re-renders
  const currentLeaderboard = useMemo(() =>
    activeTab === 'ads' ? adsLeaderboard : winsLeaderboard,
    [activeTab, adsLeaderboard, winsLeaderboard]
  );
  const currentUserRank = activeTab === 'ads' ? currentUserAdsRank : currentUserWinsRank;

  // Memoize list entries
  const listEntries = useMemo(() => currentLeaderboard.slice(3), [currentLeaderboard]);

  // Memoize top 3 entries
  const top3Entries = useMemo(() => currentLeaderboard.slice(0, 3), [currentLeaderboard]);

  // Memoized render item
  const renderItem = useCallback(({item, index}: {item: LeaderboardEntry; index: number}) => (
    <LeaderboardRow
      entry={item}
      type={activeTab}
      index={index}
      colors={colors}
      isDark={isDark}
    />
  ), [activeTab, colors, isDark]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: LeaderboardEntry) => item.id, []);

  // Memoized header component
  const renderHeader = useCallback(() => (
    <View>
      {/* Podium */}
      {top3Entries.length >= 3 && (
        <Podium
          entries={top3Entries}
          type={activeTab}
          colors={colors}
          isDark={isDark}
        />
      )}

      {/* Separator */}
      <View style={[styles.separator, {backgroundColor: colors.border}]}>
        <Text style={[styles.separatorText, {color: colors.textMuted, backgroundColor: isDark ? colors.background : COLORS.background}]}>
          Classifica completa
        </Text>
      </View>
    </View>
  ), [top3Entries, activeTab, colors, isDark]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === 'ads' ? 'play-circle-outline' : 'trophy-outline'}
        size={64}
        color={colors.textMuted}
      />
      <Text style={[styles.emptyText, {color: colors.textMuted}]}>
        Nessun dato disponibile
      </Text>
    </View>
  );

  // Debug footer with test buttons
  const renderFooter = () => (
    <View style={styles.debugContainer}>
      <Text style={[styles.debugTitle, {color: colors.textMuted}]}>
        Debug - Test Posizioni
      </Text>
      <View style={styles.debugButtonsRow}>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: '#FFD700'}]}
          onPress={() => debugSetUserRank(1, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: '#C0C0C0'}]}
          onPress={() => debugSetUserRank(2, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#2</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: '#CD7F32'}]}
          onPress={() => debugSetUserRank(3, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#3</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: colors.primary}]}
          onPress={() => debugSetUserRank(10, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#10</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.debugButtonsRow}>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: colors.primary}]}
          onPress={() => debugSetUserRank(50, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#50</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, {backgroundColor: colors.primary}]}
          onPress={() => debugSetUserRank(99, user?.displayName || 'Test User', userAvatarUrl)}>
          <Text style={styles.debugButtonText}>#99</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonReset]}
          onPress={debugResetUserRank}>
          <Text style={styles.debugButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={[styles.headerTitle, {color: colors.text}]}>Classifica</Text>
        <View style={{width: 40}} />
      </View>

      {/* Update Info Text */}
      <Text style={[styles.updateScheduleText, {color: colors.text}]}>
        Aggiornamento classifica alle 00:00
      </Text>

      {/* User Position Info */}
      <View style={styles.userPositionContainer}>
        <Text style={[styles.userPositionLabel, {color: colors.textMuted}]}>
          La tua posizione:
        </Text>
        <Text style={[styles.userPositionValue, {color: colors.primary}]}>
          {currentUserRank ? `#${currentUserRank}` : 'Non in classifica'}
        </Text>
      </View>

      {/* Animated Tab Selector */}
      <View style={styles.tabWrapper}>
        <AnimatedTab
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      {/* Leaderboard list - optimized for smooth tab switching */}
      <FlatList
        data={listEntries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 64,
          offset: 64 * index,
          index,
        })}
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
  updateScheduleText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  userPositionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  userPositionLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  userPositionValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  tabWrapper: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  // Animated Tabs
  animatedTabsContainer: {
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
    width: (SCREEN_WIDTH - SPACING.md * 2 - 8) / 2,
    height: '100%',
    borderRadius: RADIUS.lg,
  },
  tabIndicatorGradient: {
    flex: 1,
    borderRadius: RADIUS.lg,
  },
  animatedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 6,
    zIndex: 1,
  },
  animatedTabText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
  },
  activeAnimatedTabText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  podiumItem: {
    alignItems: 'center',
    width: 100,
  },
  podiumAvatarContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  currentUserBorder: {
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 30,
    padding: 2,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  podiumAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarText: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  medalBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  podiumName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2,
    maxWidth: 80,
  },
  podiumValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  podiumValue: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  podiumBase: {
    width: 70,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  separator: {
    height: 1,
    marginVertical: SPACING.md,
  },
  separatorText: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{translateX: -60}],
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  rowContainer: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserRow: {
    borderWidth: 2,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    marginRight: SPACING.sm,
  },
  rankText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#666',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: '#FFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
  },
  currentUserName: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.md,
  },
  // Debug styles
  debugContainer: {
    marginTop: SPACING.lg,
    marginBottom: 120,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: RADIUS.lg,
  },
  debugTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  debugButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  debugButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 60,
    alignItems: 'center',
  },
  debugButtonReset: {
    backgroundColor: '#FF4444',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default LeaderboardScreen;
