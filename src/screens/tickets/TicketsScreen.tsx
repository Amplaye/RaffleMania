import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {ScreenContainer, Card, Badge} from '../../components/common';
import {useTicketsStore, usePrizesStore} from '../../store';
import {Ticket} from '../../types';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
} from '../../utils/constants';
import {formatDate, formatTicketCode} from '../../utils/formatters';

type TabType = 'active' | 'history';

interface TicketsScreenProps {
  navigation: any;
}

export const TicketsScreen: React.FC<TicketsScreenProps> = ({navigation}) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const {activeTickets, pastTickets, fetchTickets, isLoading} = useTicketsStore();
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

  const getSourceLabel = (source: Ticket['source']): string => {
    switch (source) {
      case 'ad':
        return 'Pubblicita';
      case 'credits':
        return 'Crediti';
      case 'referral':
        return 'Referral';
      case 'bonus':
        return 'Bonus';
      default:
        return source;
    }
  };

  const getSourceVariant = (source: Ticket['source']): 'primary' | 'secondary' | 'success' | 'warning' => {
    switch (source) {
      case 'ad':
        return 'primary';
      case 'credits':
        return 'secondary';
      case 'referral':
        return 'success';
      case 'bonus':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const tickets = activeTab === 'active' ? activeTickets : pastTickets;

  const renderTicket = ({item}: {item: Ticket}) => {
    const prize = prizes.find(p => p.id === item.prizeId);

    return (
      <Card
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketCode}>{formatTicketCode(item.uniqueCode)}</Text>
          {item.isWinner && (
            <Badge text="VINCENTE!" variant="success" />
          )}
        </View>

        <View style={styles.ticketInfo}>
          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Premio:</Text>
            <Text style={styles.ticketValue}>{prize?.name || 'N/A'}</Text>
          </View>
          <View style={styles.ticketRow}>
            <Text style={styles.ticketLabel}>Data:</Text>
            <Text style={styles.ticketValue}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.ticketFooter}>
          <Badge
            text={getSourceLabel(item.source)}
            variant={getSourceVariant(item.source)}
            size="small"
          />
        </View>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎫</Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' ? 'Nessun biglietto attivo' : 'Nessuno storico'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active'
          ? 'Guarda una pubblicita per ottenere il tuo primo biglietto!'
          : 'I tuoi biglietti passati appariranno qui'}
      </Text>
    </View>
  );

  return (
    <ScreenContainer scrollable={false} padded={false}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}>
            Attivi ({activeTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}>
            Storico ({pastTickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={renderEmpty}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  ticketCard: {
    marginBottom: SPACING.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketCode: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 2,
  },
  ticketInfo: {
    marginBottom: SPACING.sm,
  },
  ticketRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  ticketLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    width: 60,
  },
  ticketValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    flex: 1,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default TicketsScreen;
