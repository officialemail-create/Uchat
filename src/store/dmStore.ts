import { create } from 'zustand';
import type { UserPresence } from '@workspace/api-client-react';

export type DmMessage = {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  seq?: number | null;
  unsent?: boolean;
  starred?: boolean;
  reactions?: Record<string, number>;
  kind?: 'text' | 'image' | 'voice';
  attachmentUrl?: string;
  attachmentName?: string;
  voiceDuration?: number | null;
  voiceMimeType?: string;
  voiceSize?: number;
  _pendingKey?: string;
};

export function normalizeDmMessage(message: Partial<DmMessage> & Record<string, any>, chatId: string): DmMessage {
  const content = message.content ?? '';
  const reactions = Array.isArray(message.reactions)
    ? Object.fromEntries(message.reactions.map((reaction: { emoji: string; count: number }) => [reaction.emoji, reaction.count]))
    : message.reactions;

  return {
    id: message.id ?? `message-${Date.now()}`,
    chatId: message.chatId ?? chatId,
    senderId: message.senderId ?? '',
    senderUsername: message.senderUsername ?? '',
    senderName: message.senderName ?? '',
    content,
    timestamp: message.timestamp ?? message.createdAt ?? new Date().toISOString(),
    status: message.status ?? 'delivered',
    seq: message.seq ?? null,
    unsent: message.unsent,
    starred: message.starred,
    reactions,
    kind: message.kind ?? (message.voiceNote || message.voice_note ? 'voice' : 'text'),
    attachmentUrl: message.attachmentUrl ?? message.audioUrl ?? message.audio_url,
    attachmentName: message.attachmentName,
    voiceDuration: message.voiceDuration ?? message.duration ?? null,
    voiceMimeType: message.voiceMimeType ?? message.mimeType,
    voiceSize: message.voiceSize ?? message.size,
    _pendingKey: message._pendingKey,
  };
}

interface DmStore {
  messages: DmMessage[];
  typingUsers: Record<string, string[]>; // chatId -> array of usernames
  unreadCounts: Record<string, number>; // chatId -> count
  presence: Record<string, UserPresence>; // userId -> presence
  
  setMessages: (messages: DmMessage[]) => void;
  prependMessages: (messages: DmMessage[]) => void;
  addMessage: (message: DmMessage | (Partial<DmMessage> & Record<string, any>)) => void;
  mergeMessages: (messages: DmMessage[]) => void;
  updateMessage: (messageId: string, updates: Partial<DmMessage>) => void;
  removeMessage: (messageId: string) => void;
  markMessagesRead: (chatId: string, messageIds: string[]) => void;
  
  setTyping: (chatId: string, users: string[]) => void;
  incrementUnread: (chatId: string) => void;
  setUnreadCount: (chatId: string, count: number) => void;
  clearUnread: (chatId: string) => void;
  setPresence: (userId: string, presence: UserPresence) => void;
  reset: () => void;
}

export const useDmStore = create<DmStore>((set) => ({
  messages: [],
  typingUsers: {},
  unreadCounts: {},
  presence: {},

  setMessages: (messages) => set({ messages }),
  prependMessages: (older) =>
    set((state) => ({
      messages: [...older.filter(m => !state.messages.some(sm => sm.id === m.id)), ...state.messages],
    })),
  addMessage: (message) =>
    set((state) => {
      const normalized = normalizeDmMessage(message, message.chatId ?? '');
      if (state.messages.some((m) => m.id === normalized.id)) return state;
      return { messages: [...state.messages, normalized] };
    }),
  mergeMessages: (messages) =>
    set((state) => ({
      messages: Array.from(new Map([...state.messages, ...messages].map((message) => [message.id, message])).values()),
    })),
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((message) => message.id === messageId ? { ...message, ...updates } : message),
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) => m.id === messageId ? { ...m, deleted: true } : m),
    })),
  markMessagesRead: (chatId, messageIds) =>
    set((state) => ({
      messages: state.messages.map((m) => 
        m.chatId === chatId && messageIds.includes(m.id) ? { ...m, status: 'read' as const } : m
      ),
    })),

  setTyping: (chatId, users) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: Array.from(new Set((users ?? []).filter(Boolean))).sort(),
      },
    })),
  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: (state.unreadCounts[chatId] || 0) + 1 },
    })),
  setUnreadCount: (chatId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: Math.max(0, count) },
    })),
  clearUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
    })),
  
  setPresence: (userId, presence) =>
    set((state) => ({
      presence: {
        ...state.presence,
        [userId]: {
          ...(state.presence[userId] ?? {}),
          ...presence,
          online: Boolean(presence.online),
          lastSeen: presence.lastSeen ?? state.presence[userId]?.lastSeen ?? new Date().toISOString(),
        },
      },
    })),
  reset: () => set({ messages: [], typingUsers: {}, unreadCounts: {}, presence: {} }),
}));
