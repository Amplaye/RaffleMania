import {create} from 'zustand';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import apiClient from '../services/apiClient';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'support';
  timestamp: Date;
  read: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  unreadCount: number;

  // Actions
  initializeChat: (userId: string, userName: string) => void;
  sendMessage: (userId: string, userName: string, text: string) => Promise<void>;
  markAsRead: (userId: string) => Promise<void>;
  cleanup: () => void;
}

const db = getFirestore();

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  unsubscribe: null,
  unreadCount: 0,

  initializeChat: (userId: string, userName: string) => {
    // Cleanup existing subscription
    const {unsubscribe: existingUnsub} = get();
    if (existingUnsub) {
      existingUnsub();
    }

    set({isLoading: true, error: null});

    // Create or get chat room for this user
    const messagesRef = collection(db, 'chats', userId, 'messages');
    const chatQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      chatQuery,
      snapshot => {
        const messages: ChatMessage[] = [];
        let unreadCount = 0;

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const message: ChatMessage = {
            id: docSnap.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            senderType: data.senderType,
            timestamp: data.timestamp?.toDate() || new Date(),
            read: data.read || false,
          };
          messages.push(message);

          // Count unread messages from support
          if (data.senderType === 'support' && !data.read) {
            unreadCount++;
          }
        });

        set({messages, isLoading: false, unreadCount});
      },
      error => {
        console.error('Chat subscription error:', error);
        set({error: error.message, isLoading: false});
      },
    );

    // Update chat room metadata
    const chatDocRef = doc(db, 'chats', userId);
    setDoc(
      chatDocRef,
      {
        userId,
        userName,
        lastActivity: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      {merge: true},
    ).catch(err => console.error('Error updating chat metadata:', err));

    set({unsubscribe});
  },

  sendMessage: async (userId: string, userName: string, text: string) => {
    if (!text.trim()) return;

    try {
      const messageData = {
        text: text.trim(),
        senderId: userId,
        senderName: userName,
        senderType: 'user',
        timestamp: serverTimestamp(),
        read: false,
      };

      // Add message to subcollection
      const messagesRef = collection(db, 'chats', userId, 'messages');
      await addDoc(messagesRef, messageData);

      // Update chat room last activity and last message
      const chatDocRef = doc(db, 'chats', userId);
      await setDoc(
        chatDocRef,
        {
          lastMessage: text.trim(),
          lastMessageTime: serverTimestamp(),
          lastMessageBy: 'user',
          hasUnreadFromUser: true,
        },
        {merge: true},
      );

      // Notify admin about new message (fire and forget)
      apiClient
        .post('/support/notify-admin', {
          user_id: userId,
          user_name: userName,
          message: text.trim().substring(0, 100),
        })
        .catch(() => {
          // Silently ignore - admin notification is optional
        });
    } catch (error: any) {
      console.error('Error sending message:', error);
      set({error: error.message});
      throw error;
    }
  },

  markAsRead: async (userId: string) => {
    try {
      // Get all unread messages from support
      const messagesRef = collection(db, 'chats', userId, 'messages');
      const unreadQuery = query(
        messagesRef,
        where('senderType', '==', 'support'),
        where('read', '==', false),
      );
      const unreadMessages = await getDocs(unreadQuery);

      // Batch update all unread messages
      const batch = writeBatch(db);
      unreadMessages.forEach(docSnap => {
        batch.update(docSnap.ref, {read: true});
      });

      await batch.commit();
      set({unreadCount: 0});
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  },

  cleanup: () => {
    const {unsubscribe} = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({
      messages: [],
      isLoading: false,
      error: null,
      unsubscribe: null,
      unreadCount: 0,
    });
  },
}));
