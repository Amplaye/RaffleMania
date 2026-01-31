import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AnimatedBackground} from '../../components/common';
import {usePrizesStore} from '../../store';
import {useThemeColors} from '../../hooks/useThemeColors';
import {Prize} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface PrizesScreenProps {
  navigation: any;
}

type TabType = 'in_corso' | 'futuri';

// Animated Tab Component (same style as LeaderboardScreen)
const AnimatedTab: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({activeTab, onTabChange}) => {
  const {neon, colors} = useThemeColors();
  const slideAnim = useRef(new Animated.Value(activeTab === 'in_corso' ? 0 : 1)).current;

  useEffect(() => {
    const toValue = activeTab === 'in_corso' ? 0 : 1;
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
    <View style={[styles.animatedTabsContainer, {backgroundColor: colors.card}, neon.glowSubtle]}>
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
        onPress={() => onTabChange('in_corso')}
        activeOpacity={0.7}>
        <Ionicons
          name="flame"
          size={16}
          color={activeTab === 'in_corso' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.animatedTabText,
            activeTab === 'in_corso' && styles.activeAnimatedTabText,
          ]}>
          Raffle in Corso
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.animatedTab}
        onPress={() => onTabChange('futuri')}
        activeOpacity={0.7}>
        <Ionicons
          name="calendar"
          size={16}
          color={activeTab === 'futuri' ? COLORS.white : COLORS.textMuted}
        />
        <Text
          style={[
            styles.animatedTabText,
            activeTab === 'futuri' && styles.activeAnimatedTabText,
          ]}>
          Raffle Futuri
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Prize Card Component for the list
const PrizeListCard: React.FC<{
  prize: Prize;
  onPress: () => void;
}> = ({prize, onPress}) => {
  const {colors} = useThemeColors();
  const progress = Math.min(prize.currentAds / prize.goalAds, 1);
  const percentage = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.prizeCard, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.9}>
      <View style={styles.prizeCardContent}>
        {/* Prize Image */}
        <View style={styles.prizeImageContainer}>
          <Image
            source={{uri: prize.imageUrl}}
            style={styles.prizeImage}
            resizeMode="contain"
          />
        </View>

        {/* Prize Info */}
        <View style={styles.prizeInfo}>
          <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={2}>
            {prize.name}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, {backgroundColor: `${COLORS.primary}15`}]}>
              <LinearGradient
                colors={[COLORS.primary, '#FF8500']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.progressFill, {width: `${percentage}%`}]}
              />
            </View>
            <Text style={[styles.progressText, {color: colors.textMuted}]}>
              {percentage}% - {prize.goalAds - prize.currentAds} biglietti mancanti
            </Text>
          </View>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
};

// Future Prize Card with section header
const FuturePrizeCard: React.FC<{
  prize: Prize;
  section: string;
  onPress: () => void;
}> = ({prize, section, onPress}) => {
  const {colors} = useThemeColors();

  return (
    <View style={styles.futurePrizeWrapper}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>{section}</Text>
      </View>

      {/* Card */}
      <TouchableOpacity
        style={[styles.prizeCard, {backgroundColor: colors.card}]}
        onPress={onPress}
        activeOpacity={0.9}>
        <View style={styles.prizeCardContent}>
          <View style={styles.prizeImageContainer}>
            <Image
              source={{uri: prize.imageUrl}}
              style={styles.prizeImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.prizeInfo}>
            <Text style={[styles.prizeName, {color: colors.text}]} numberOfLines={2}>
              {prize.name}
            </Text>
            <Text style={[styles.comingSoonText, {color: COLORS.primary}]}>
              Prossimamente
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const PrizesScreen: React.FC<PrizesScreenProps> = ({navigation}) => {
  const {colors, gradientColors, isDark} = useThemeColors();
  const {prizes, fetchPrizes} = usePrizesStore();
  const [activeTab, setActiveTab] = useState<TabType>('in_corso');

  useEffect(() => {
    fetchPrizes();
  }, []);

  // Filter prizes by status
  const activePrizes = prizes.filter(p => p.isActive);
  const futurePrizes = prizes.filter(p => !p.isActive);

  const handlePrizePress = (prize: Prize) => {
    navigation.navigate('PrizeDetail', {prizeId: prize.id});
  };

  // Mock future prizes sections
  const futureSections = [
    {section: 'Febbraio 2026', prizes: futurePrizes.slice(0, 1)},
    {section: 'Marzo 2026', prizes: futurePrizes.slice(1, 2)},
    {section: 'Aprile 2026', prizes: futurePrizes.slice(2, 3)},
  ].filter(s => s.prizes.length > 0);

  return (
    <LinearGradient
      colors={gradientColors as unknown as string[]}
      locations={[0, 0.25, 0.5, 0.75, 1]}
      start={{x: 0.5, y: 0}}
      end={{x: 0.5, y: 1}}
      style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <AnimatedBackground />

      <View style={styles.content}>
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

        {/* Animated Tabs */}
        <View style={styles.tabWrapper}>
          <AnimatedTab
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </View>

        {/* Content based on tab */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {activeTab === 'in_corso' ? (
            // Active Raffles
            activePrizes.length > 0 ? (
              activePrizes.map((prize) => (
                <PrizeListCard
                  key={prize.id}
                  prize={prize}
                  onPress={() => handlePrizePress(prize)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={64} color={colors.border} />
                <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                  Nessun raffle attivo al momento
                </Text>
              </View>
            )
          ) : (
            // Future Raffles
            futureSections.length > 0 ? (
              futureSections.map((section) =>
                section.prizes.map((prize) => (
                  <FuturePrizeCard
                    key={prize.id}
                    prize={prize}
                    section={section.section}
                    onPress={() => handlePrizePress(prize)}
                  />
                ))
              )
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color={colors.border} />
                <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                  Nessun raffle programmato
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 50,
  },
  // Banner
  bannerContainer: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  bannerTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  bannerBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Animated Tabs
  tabWrapper: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  animatedTabsContainer: {
    flexDirection: 'row',
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
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 120,
  },
  // Prize Card
  prizeCard: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    overflow: 'hidden',
  },
  prizeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  prizeImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#FFF8F0',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeImage: {
    width: '80%',
    height: '80%',
  },
  prizeInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  prizeName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.xs,
  },
  progressContainer: {
    marginTop: SPACING.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  // Future Prize
  futurePrizeWrapper: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textTransform: 'uppercase',
  },
  comingSoonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.xs,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default PrizesScreen;
