import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAdminChatStore, ChatRoom} from '../../store/useAdminChatStore';
import {useThemeColors} from '../../hooks/useThemeColors';
import {
  COLORS,
  FONT_SIZE,
  FONT_FAMILY,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
} from '../../utils/constants';
import {RootStackParamList} from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminChatList'>;

export const AdminChatListScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const insets = useSafeAreaInsets();
  const {chatRooms, isLoading, initializeChatRooms, cleanup} = useAdminChatStore();

  useEffect(() => {
    initializeChatRooms();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}g fa`;
    } else if (hours > 0) {
      return `${hours}h fa`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes > 0 ? `${minutes}m fa` : 'Ora';
    }
  };

  const unreadCount = chatRooms.filter(r => r.hasUnreadFromUser).length;

  const renderChatRoom = ({item}: {item: ChatRoom}) => (
    <TouchableOpacity
      style={[
        styles.chatItem,
        {
          backgroundColor: item.hasUnreadFromUser
            ? `${COLORS.primary}15`
            : 'transparent',
          borderBottomColor: isDark ? '#333333' : '#E0E0E0',
        },
      ]}
      onPress={() =>
        navigation.navigate('AdminChatDetail', {
          userId: item.userId,
          userName: item.userName,
        })
      }
      activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: item.hasUnreadFromUser
                ? COLORS.primary
                : colors.textSecondary,
            },
          ]}>
          <Text style={styles.avatarText}>
            {item.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        {item.hasUnreadFromUser && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text
            style={[
              styles.userName,
              {color: colors.text},
              item.hasUnreadFromUser && styles.userNameUnread,
            ]}>
            {item.userName}
          </Text>
          <Text style={[styles.timeText, {color: colors.textSecondary}]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text
          style={[
            styles.lastMessage,
            {color: colors.textSecondary},
            item.hasUnreadFromUser && {
              color: colors.text,
              fontWeight: FONT_WEIGHT.medium,
            },
          ]}
          numberOfLines={1}>
          {item.lastMessageBy === 'support' ? 'Tu: ' : ''}
          {item.lastMessage}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, {color: colors.text}]}>
        Nessuna chat
      </Text>
      <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
        Le richieste di supporto degli utenti appariranno qui
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + SPACING.sm,
            borderBottomColor: isDark ? '#333333' : '#E0E0E0',
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatarContainer, {backgroundColor: COLORS.primary}]}>
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, {color: colors.text}]}>
              Chat Supporto
            </Text>
            <Text style={[styles.headerSubtitle, {color: colors.textSecondary}]}>
              {chatRooms.length} conversazioni
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Chat List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={item => item.id}
          renderItem={renderChatRoom}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={chatRooms.length === 0 ? styles.emptyList : undefined}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
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
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
    gap: SPACING.sm,
  },
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  badgeContainer: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  userNameUnread: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
  },
  timeText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  lastMessage: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyList: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
});
