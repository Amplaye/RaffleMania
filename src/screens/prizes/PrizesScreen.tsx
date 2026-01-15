import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, Image} from 'react-native';
import {ScreenContainer, Card, Badge} from '../../components/common';
import {usePrizesStore} from '../../store';
import {Prize} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../utils/constants';
import {formatCurrency} from '../../utils/formatters';

interface PrizesScreenProps {
  navigation: any;
}

export const PrizesScreen: React.FC<PrizesScreenProps> = ({navigation}) => {
  const {prizes, upcomingDraws, fetchPrizes, fetchDraws, isLoading} =
    usePrizesStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrizes();
    fetchDraws();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPrizes(), fetchDraws()]);
    setRefreshing(false);
  };

  const getDrawForPrize = (prizeId: string) => {
    return upcomingDraws.find(draw => draw.prizeId === prizeId);
  };

  const renderPrize = ({item, index}: {item: Prize; index: number}) => {
    const draw = getDrawForPrize(item.id);
    const isToday = index === 0;

    return (
      <Card
        style={styles.prizeCard}
        padding="none"
        onPress={() => navigation.navigate('PrizeDetail', {prizeId: item.id})}>
        <Image
          source={{uri: item.imageUrl}}
          style={styles.prizeImage}
          resizeMode="cover"
        />
        {isToday && (
          <View style={styles.todayBadge}>
            <Badge text="OGGI" variant="warning" />
          </View>
        )}
        <View style={styles.prizeContent}>
          <Text style={styles.prizeName}>{item.name}</Text>
          <Text style={styles.prizeDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.prizeFooter}>
            <Text style={styles.prizeValue}>{formatCurrency(item.value)}</Text>
            {draw && (
              <Text style={styles.drawDate}>
                {new Date(draw.scheduledAt).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Premi in Palio</Text>
      <Text style={styles.subtitle}>
        Guarda le pubblicita per vincere questi fantastici premi!
      </Text>
    </View>
  );

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <FlatList
        data={prizes.filter(p => p.isActive)}
        renderItem={renderPrize}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderHeader}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.md,
  },
  prizeCard: {
    marginBottom: SPACING.md,
  },
  prizeImage: {
    width: '100%',
    height: 160,
  },
  todayBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  prizeContent: {
    padding: SPACING.md,
  },
  prizeName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  prizeDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  prizeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  prizeValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  drawDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});

export default PrizesScreen;
