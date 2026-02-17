import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useAuthStore} from '../../store';
import {useChatStore, ChatMessage} from '../../store/useChatStore';
import {isAdminEmail} from '../../utils/adminConfig';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_FAMILY,
  FONT_WEIGHT,
  RADIUS,
} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportChat'>;

const MessageBubble: React.FC<{message: ChatMessage; isOwn: boolean; isDark: boolean}> = ({
  message,
  isOwn,
  isDark,
}) => {
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
        isOwn ? styles.ownMessage : styles.otherMessage,
        isOwn
          ? {backgroundColor: COLORS.primary}
          : {backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'},
      ]}>
      <Text
        style={[
          styles.messageText,
          {color: isOwn ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000'},
        ]}>
        {message.text}
      </Text>
      <Text
        style={[
          styles.messageTime,
          {color: isOwn ? 'rgba(255,255,255,0.7)' : isDark ? '#888888' : '#666666'},
        ]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};

export const SupportChatScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(state => state.user);
  const {
    messages,
    isLoading,
    error,
    initializeChat,
    sendMessage,
    markAsRead,
    cleanup,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Initialize chat on mount
  useEffect(() => {
    if (user) {
      initializeChat(user.id, user.displayName || user.email || 'Utente');
    }

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (user && messages.length > 0) {
      markAsRead(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText('');

    try {
      await sendMessage(user.id, user.displayName || user.email || 'Utente', textToSend);
    } catch {
      // Restore text if send failed
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({item}: {item: ChatMessage}) => {
    const isOwn = item.senderType === 'user';
    return <MessageBubble message={item} isOwn={isOwn} isDark={isDark} />;
  };

  const isAdmin = isAdminEmail(user?.email);

  const renderSupportHours = () => {
    if (isAdmin) return null;
    return (
      <View style={[styles.supportHoursBubble, {backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0'}]}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{marginRight: 6}} />
        <Text style={[styles.supportHoursText, {color: isDark ? '#CCCCCC' : '#555555'}]}>
          Il supporto sarà operativo dalle ore 09:00 alle ore 00:00, cercheremo di rispondere sempre il prima possibile, grazie.
        </Text>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, {color: colors.text}]}>
        Assistenza RaffleMania
      </Text>
      <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
        Ciao! Come possiamo aiutarti?{'\n'}Scrivi un messaggio per iniziare.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          <View style={[styles.avatarContainer, {backgroundColor: COLORS.primary}]}>
            <Ionicons name="headset" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, {color: colors.text}]}>
              Supporto
            </Text>
            <Text style={[styles.headerSubtitle, {color: colors.textSecondary}]}>
              Solitamente risponde entro 15 min
            </Text>
          </View>
        </View>
        <View style={{width: 40}} />
      </View>

      {/* Messages */}
      {isLoading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList,
          ]}
          ListHeaderComponent={renderSupportHours}
          ListEmptyComponent={renderEmptyChat}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({animated: false});
            }
          }}
        />
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isSending}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? COLORS.primary : isDark ? '#333333' : '#E0E0E0',
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}>
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : colors.textSecondary}
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
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
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
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
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
  supportHoursBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  supportHoursText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SupportChatScreen;
