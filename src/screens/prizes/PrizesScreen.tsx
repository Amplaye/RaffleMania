import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {usePrizesStore} from '../../store';
import {Prize} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;

interface PrizesScreenProps {
  navigation: any;
}

// Smooth Progress Bar Component
const SmoothProgressBar: React.FC<{
  currentAds: number;
  goalAds: number;
  prizeId: string;
}> = ({currentAds, goalAds, prizeId}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const prevPrizeId = useRef(prizeId);

  const percentage = Math.min((currentAds / goalAds) * 100, 100);

  useEffect(() => {
    if (prevPrizeId.current !== prizeId) {
      progressAnim.setValue(0);
      prevPrizeId.current = prizeId;
    }

    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage, prizeId]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, {width: animatedWidth}]}>
          <LinearGradient
            colors={[COLORS.primary, '#FF8500']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {currentAds.toLocaleString()} / {goalAds.toLocaleString()}
        </Text>
        <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
};

// Prize Card Component
const PrizeCard: React.FC<{
  item: Prize;
  index: number;
  onWatchAd: (prizeId: string) => void;
}> = ({item, index, onWatchAd}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
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
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleWatchAd = () => {
    onWatchAd(item.id);
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <View style={styles.card}>
        {/* Prize Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.imageUrl}}
            style={styles.prizeImage}
            resizeMode="contain"
          />
        </View>

        {/* Prize Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.prizeName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Progress Bar */}
          <SmoothProgressBar
            currentAds={item.currentAds}
            goalAds={item.goalAds}
            prizeId={item.id}
          />

          {/* Watch Ad Button */}
          <TouchableOpacity
            style={styles.watchButton}
            activeOpacity={0.8}
            onPress={handleWatchAd}>
            <LinearGradient
              colors={[COLORS.primary, '#FF8500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.watchButtonGradient}>
              <Ionicons name="play-circle" size={20} color={COLORS.white} />
              <Text style={styles.watchButtonText}>Guarda Ads</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export const PrizesScreen: React.FC<PrizesScreenProps> = ({navigation}) => {
  const {prizes, fetchPrizes, incrementAdsForPrize, isLoading} = usePrizesStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrizes();
    setRefreshing(false);
  };

  const handleWatchAd = (prizeId: string) => {
    // TODO: Integrate real AdMob here
    // For now, simulate ad completion
    incrementAdsForPrize(prizeId);
  };

  const activePrizes = prizes.filter(p => p.isActive);

  const renderPrize = ({item, index}: {item: Prize; index: number}) => (
    <PrizeCard
      item={item}
      index={index}
      onWatchAd={handleWatchAd}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Premi</Text>
      <Text style={styles.subtitle}>
        Guarda le ads per partecipare alle estrazioni
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={64} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Nessun premio disponibile</Text>
      <Text style={styles.emptySubtitle}>
        Torna presto per nuovi fantastici premi!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <FlatList
        data={activePrizes}
        renderItem={renderPrize}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingTop: SPACING.xl + 30,
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Card Styles
  cardContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  prizeImage: {
    width: '80%',
    height: '100%',
  },
  infoContainer: {
    padding: SPACING.md,
  },
  prizeName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  // Progress Bar Styles
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    color: COLORS.textMuted,
  },
  progressPercentage: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  // Watch Button Styles
  watchButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  watchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  watchButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default PrizesScreen;
