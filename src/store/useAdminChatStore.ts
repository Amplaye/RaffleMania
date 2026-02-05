import {create} from 'zustand';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import {API_CONFIG} from '../utils/constants';

const db = getFirestore();

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
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, orderBy('lastMessageTime', 'desc'));

    const unsubscribe = onSnapshot(
      chatsQuery,
      snapshot => {
        const rooms: ChatRoom[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          rooms.push({
            id: docSnap.id,
            userId: docSnap.id,
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
      },
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
    const messagesRef = collection(db, 'chats', userId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        const messages: ChatMessage[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          messages.push({
            id: docSnap.id,
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
      },
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
        timestamp: serverTimestamp(),
        read: false,
      };

      // Add message to subcollection
      const messagesRef = collection(db, 'chats', userId, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat room metadata
      const chatDocRef = doc(db, 'chats', userId);
      await setDoc(
        chatDocRef,
        {
          lastMessage: text.trim(),
          lastMessageTime: serverTimestamp(),
          lastMessageBy: 'support',
          hasUnreadFromUser: false,
        },
        {merge: true},
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
      const messagesRef = collection(db, 'chats', userId, 'messages');
      const unreadQuery = query(
        messagesRef,
        where('senderType', '==', 'user'),
        where('read', '==', false),
      );
      const unreadMessages = await getDocs(unreadQuery);

      if (unreadMessages.empty) return;

      // Batch update all unread messages
      const batch = writeBatch(db);
      unreadMessages.forEach(docSnap => {
        batch.update(docSnap.ref, {read: true});
      });

      await batch.commit();

      // Update chat room
      const chatDocRef = doc(db, 'chats', userId);
      await updateDoc(chatDocRef, {hasUnreadFromUser: false});
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
