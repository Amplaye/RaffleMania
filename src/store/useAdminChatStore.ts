import {create} from 'zustand';
import firestore from '@react-native-firebase/firestore';
import {API_CONFIG} from '../utils/constants';

// Send push notification to user via WordPress/OneSignal
const notifyUserOfAdminReply = async (userId: string, message: string) => {
  try {
    await fetch(`${API_CONFIG.BASE_URL}/rafflemania/v1/chat/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
      }),
    });
  } catch (error) {
    // Non-critical: user will still see the message in app
    console.log('Failed to send push notification (non-critical):', error);
  }
};

export interface ChatRoom {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageBy: 'user' | 'support';
  hasUnreadFromUser: boolean;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'support';
  timestamp: Date;
  read: boolean;
}

interface AdminChatState {
  chatRooms: ChatRoom[];
  currentChatMessages: ChatMessage[];
  currentChatUserId: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribeRooms: (() => void) | null;
  unsubscribeMessages: (() => void) | null;

  // Actions
  initializeChatRooms: () => void;
  openChat: (userId: string) => void;
  closeChat: () => void;
  sendAdminMessage: (userId: string, text: string, adminName: string) => Promise<void>;
  markUserMessagesAsRead: (userId: string) => Promise<void>;
  cleanup: () => void;
}

export const useAdminChatStore = create<AdminChatState>((set, get) => ({
  chatRooms: [],
  currentChatMessages: [],
  currentChatUserId: null,
  isLoading: false,
  error: null,
  unsubscribeRooms: null,
  unsubscribeMessages: null,

  initializeChatRooms: () => {
    const {unsubscribeRooms: existingUnsub} = get();
    if (existingUnsub) {
      existingUnsub();
    }

    set({isLoading: true, error: null});

    // Subscribe to all chat rooms
    const unsubscribe = firestore()
      .collection('chats')
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot(
        snapshot => {
          const rooms: ChatRoom[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            rooms.push({
              id: doc.id,
              userId: doc.id,
              userName: data.userName || 'Utente',
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
              lastMessageBy: data.lastMessageBy || 'user',
              hasUnreadFromUser: data.hasUnreadFromUser || false,
              createdAt: data.createdAt?.toDate() || new Date(),
            });
          });
          set({chatRooms: rooms, isLoading: false});
        },
        error => {
          console.error('Admin chat rooms subscription error:', error);
          set({error: error.message, isLoading: false});
        }
      );

    set({unsubscribeRooms: unsubscribe});
  },

  openChat: (userId: string) => {
    const {unsubscribeMessages: existingUnsub} = get();
    if (existingUnsub) {
      existingUnsub();
    }

    set({currentChatUserId: userId, isLoading: true});

    // Subscribe to messages for this chat
    const unsubscribe = firestore()
      .collection('chats')
      .doc(userId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(
        snapshot => {
          const messages: ChatMessage[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              text: data.text,
              senderId: data.senderId,
              senderName: data.senderName,
              senderType: data.senderType,
              timestamp: data.timestamp?.toDate() || new Date(),
              read: data.read || false,
            });
          });
          set({currentChatMessages: messages, isLoading: false});
        },
        error => {
          console.error('Admin chat messages subscription error:', error);
          set({error: error.message, isLoading: false});
        }
      );

    set({unsubscribeMessages: unsubscribe});

    // Mark messages as read
    get().markUserMessagesAsRead(userId);
  },

  closeChat: () => {
    const {unsubscribeMessages} = get();
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
    set({
      currentChatUserId: null,
      currentChatMessages: [],
      unsubscribeMessages: null,
    });
  },

  sendAdminMessage: async (userId: string, text: string, adminName: string) => {
    if (!text.trim()) return;

    try {
      const messageData = {
        text: text.trim(),
        senderId: 'admin',
        senderName: adminName,
        senderType: 'support',
        timestamp: firestore.FieldValue.serverTimestamp(),
        read: false,
      };

      // Add message to subcollection
      await firestore()
        .collection('chats')
        .doc(userId)
        .collection('messages')
        .add(messageData);

      // Update chat room metadata
      await firestore()
        .collection('chats')
        .doc(userId)
        .set(
          {
            lastMessage: text.trim(),
            lastMessageTime: firestore.FieldValue.serverTimestamp(),
            lastMessageBy: 'support',
            hasUnreadFromUser: false,
          },
          {merge: true}
        );

      // Send push notification to user (non-blocking)
      notifyUserOfAdminReply(userId, text.trim());
    } catch (error: any) {
      console.error('Error sending admin message:', error);
      set({error: error.message});
      throw error;
    }
  },

  markUserMessagesAsRead: async (userId: string) => {
    try {
      // Get all unread messages from user
      const unreadMessages = await firestore()
        .collection('chats')
        .doc(userId)
        .collection('messages')
        .where('senderType', '==', 'user')
        .where('read', '==', false)
        .get();

      if (unreadMessages.empty) return;

      // Batch update all unread messages
      const batch = firestore().batch();
      unreadMessages.forEach(doc => {
        batch.update(doc.ref, {read: true});
      });

      await batch.commit();

      // Update chat room
      await firestore()
        .collection('chats')
        .doc(userId)
        .update({hasUnreadFromUser: false});
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  },

  cleanup: () => {
    const {unsubscribeRooms, unsubscribeMessages} = get();
    if (unsubscribeRooms) {
      unsubscribeRooms();
    }
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
    set({
      chatRooms: [],
      currentChatMessages: [],
      currentChatUserId: null,
      isLoading: false,
      error: null,
      unsubscribeRooms: null,
      unsubscribeMessages: null,
    });
  },
}));
