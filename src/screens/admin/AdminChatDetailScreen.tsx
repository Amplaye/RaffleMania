import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAdminChatStore, ChatMessage} from '../../store/useAdminChatStore';
import {useAuthStore} from '../../store';
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

type Props = NativeStackScreenProps<RootStackParamList, 'AdminChatDetail'>;

const MessageBubble: React.FC<{
  message: ChatMessage;
  isSupport: boolean;
  isDark: boolean;
}> = ({message, isSupport, isDark}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isSupport ? styles.supportMessage : styles.userMessage,
        isSupport
          ? {backgroundColor: COLORS.primary}
          : {backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'},
      ]}>
      <Text
        style={[
          styles.messageText,
          {color: isSupport ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000'},
        ]}>
        {message.text}
      </Text>
      <Text
        style={[
          styles.messageTime,
          {
            color: isSupport
              ? 'rgba(255,255,255,0.7)'
              : isDark
              ? '#888888'
              : '#666666',
          },
        ]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};

export const AdminChatDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {userId, userName} = route.params;
  const {colors, isDark} = useThemeColors();
  const insets = useSafeAreaInsets();
  const {
    currentChatMessages,
    isLoading,
    openChat,
    closeChat,
    sendAdminMessage,
  } = useAdminChatStore();
  const user = useAuthStore(state => state.user);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    openChat(userId);
    return () => closeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (currentChatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [currentChatMessages.length]);

  const handleSend = async () => {
    if (!message.trim() || sending) {
      return;
    }

    setSending(true);
    const textToSend = message;
    setMessage('');

    try {
      await sendAdminMessage(
        userId,
        textToSend,
        user?.displayName || 'Supporto',
      );
    } catch {
      setMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    } else {
      return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const renderMessage = ({item, index}: {item: ChatMessage; index: number}) => {
    const isSupport = item.senderType === 'support';
    const showDate =
      index === 0 ||
      formatDate(currentChatMessages[index - 1].timestamp) !==
        formatDate(item.timestamp);

    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text
              style={[
                styles.dateText,
                {
                  color: colors.textSecondary,
                  backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
                },
              ]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        )}
        <MessageBubble message={item} isSupport={isSupport} isDark={isDark} />
      </>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, {color: colors.text}]}>
        Nessun messaggio
      </Text>
      <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
        L'utente non ha ancora inviato messaggi
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
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
          <View
            style={[
              styles.avatarContainer,
              {backgroundColor: COLORS.primary},
            ]}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, {color: colors.text}]}>
              {userName}
            </Text>
            <Text style={[styles.headerSubtitle, {color: colors.textSecondary}]}>
              Utente
            </Text>
          </View>
        </View>
        <View style={{width: 40}} />
      </View>

      {/* Messages */}
      {isLoading && currentChatMessages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={currentChatMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesList,
            currentChatMessages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={renderEmptyChat}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (currentChatMessages.length > 0) {
              flatListRef.current?.scrollToEnd({animated: false});
            }
          }}
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            paddingBottom: insets.bottom + SPACING.sm,
            borderTopColor: isDark ? '#333333' : '#E0E0E0',
          },
        ]}>
        <View
          style={[
            styles.inputWrapper,
            {backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'},
          ]}>
          <TextInput
            style={[styles.textInput, {color: colors.text}]}
            placeholder="Scrivi una risposta..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            editable={!sending}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim()
                ? COLORS.primary
                : isDark
                ? '#333333'
                : '#E0E0E0',
            },
          ]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
          activeOpacity={0.7}>
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? '#FFFFFF' : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  emptyList: {
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  userMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  supportMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    maxHeight: 120,
  },
  textInput: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
