import { create } from 'zustand';
import type { Message } from '@workspace/api-client-react';

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface ChatStore {
  messages: Message[];
  onlineCount: number;
  typingUsers: string[];
  currentUsername: string | null;
  isConnected: boolean;
  unreadMessageIds: string[];
  selectedMenuMessageId: string | null;
  avatarColor: string;
  pendingIds: Set<string>;
  dataSaverMode: boolean;

  setMessages: (messages: Message[]) => void;
  prependMessages: (older: Message[]) => void;
  addMessage: (message: Message) => void;
  addPendingMessage: (message: Message) => void;
  replacePendingMessage: (pendingId: string, real: Message) => void;
  clearPendingMessages: () => void;
  updateMessage: (messageId: string, newMessage: string) => void;
  unsendMessage: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;
  clearDeletedMessages: () => void;
  setOnlineCount: (count: number) => void;
  setTypingUsers: (users: string[]) => void;
  setCurrentUsername: (username: string | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  markAsRead: (id: string) => void;
  setSelectedMenuMessageId: (id: string | null) => void;
  setAvatarColor: (color: string) => void;
  setDataSaverMode: (v: boolean) => void;
  reset: () => void;
}

const DEFAULT_COLOR = '#8B5CF6';

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  onlineCount: 0,
  typingUsers: [],
  currentUsername: null,
  isConnected: false,
  unreadMessageIds: [],
  selectedMenuMessageId: null,
  avatarColor: localStorage.getItem('uchat_avatar_color') || DEFAULT_COLOR,
  pendingIds: new Set<string>(),
  dataSaverMode: localStorage.getItem('uchat_data_saver') === '1',

  setMessages: (messages) => set({ messages }),

  prependMessages: (older) =>
    set((state) => ({
      messages: [
        ...older.filter((m) => !state.messages.some((e) => e.id === m.id)),
        ...state.messages,
      ],
    })),

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      const isOwn = message.senderName === state.currentUsername;
      return {
        messages: [...state.messages, message],
        unreadMessageIds: isOwn
          ? state.unreadMessageIds
          : [...state.unreadMessageIds, message.id],
      };
    }),

  addPendingMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      pendingIds: new Set([...state.pendingIds, message.id]),
    })),

  replacePendingMessage: (pendingId, real) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === pendingId ? real : m)),
      pendingIds: new Set([...state.pendingIds].filter((id) => id !== pendingId)),
    })),

  clearPendingMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => !state.pendingIds.has(m.id)),
      pendingIds: new Set(),
    })),

  updateMessage: (messageId, newMessage) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, message: newMessage, edited: true } : m,
      ),
    })),

  unsendMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, unsent: true } : m,
      ),
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  /* Remove all locally-deleted (unsent) messages from view */
  clearDeletedMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => !m.unsent),
    })),

  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  setCurrentUsername: (currentUsername) => set({ currentUsername }),
  setIsConnected: (isConnected) => set({ isConnected }),

  markAsRead: (id) =>
    set((state) => ({
      unreadMessageIds: state.unreadMessageIds.filter((uid) => uid !== id),
    })),

  setSelectedMenuMessageId: (selectedMenuMessageId) => set({ selectedMenuMessageId }),

  setAvatarColor: (color) => {
    localStorage.setItem('uchat_avatar_color', color);
    set({ avatarColor: color });
  },

  setDataSaverMode: (v) => {
    localStorage.setItem('uchat_data_saver', v ? '1' : '0');
    set({ dataSaverMode: v });
  },
  reset: () => set({ messages: [], onlineCount: 0, typingUsers: [], currentUsername: null, isConnected: false, unreadMessageIds: [], selectedMenuMessageId: null, avatarColor: DEFAULT_COLOR, pendingIds: new Set(), dataSaverMode: false }),
}));
