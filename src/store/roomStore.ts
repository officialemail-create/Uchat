import { create } from 'zustand';
import type { RoomMessage, RoomMember } from '@workspace/api-client-react';

interface RoomStore {
  messages: RoomMessage[];
  typingUsers: Record<string, string[]>; // roomId -> array of usernames
  unreadCounts: Record<string, number>; // roomId -> count
  onlineMembers: Record<string, string[]>; // roomId -> array of userIds
  
  setMessages: (messages: RoomMessage[]) => void;
  prependMessages: (messages: RoomMessage[]) => void;
  addMessage: (message: RoomMessage) => void;
  updateMessage: (messageId: string, newMessage: string) => void;
  removeMessage: (messageId: string) => void;
  
  setTyping: (roomId: string, users: string[]) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  setOnlineMembers: (roomId: string, members: string[]) => void;
  addOnlineMember: (roomId: string, userId: string) => void;
  removeOnlineMember: (roomId: string, userId: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  messages: [],
  typingUsers: {},
  unreadCounts: {},
  onlineMembers: {},

  setMessages: (messages) => set({ messages }),
  prependMessages: (older) =>
    set((state) => ({
      messages: [...older.filter(m => !state.messages.some(sm => sm.id === m.id)), ...state.messages],
    })),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),
  updateMessage: (messageId, newMessage) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, message: newMessage, edited: true } : m
      ),
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  setTyping: (roomId, users) =>
    set((state) => ({ typingUsers: { ...state.typingUsers, [roomId]: users } })),
  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: (state.unreadCounts[roomId] || 0) + 1 },
    })),
  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),
  
  setOnlineMembers: (roomId, members) =>
    set((state) => ({ onlineMembers: { ...state.onlineMembers, [roomId]: members } })),
  addOnlineMember: (roomId, userId) =>
    set((state) => {
      const current = state.onlineMembers[roomId] || [];
      if (current.includes(userId)) return state;
      return { onlineMembers: { ...state.onlineMembers, [roomId]: [...current, userId] } };
    }),
  removeOnlineMember: (roomId, userId) =>
    set((state) => {
      const current = state.onlineMembers[roomId] || [];
      return { onlineMembers: { ...state.onlineMembers, [roomId]: current.filter((id) => id !== userId) } };
    }),
  reset: () => set({ messages: [], typingUsers: {}, unreadCounts: {}, onlineMembers: {} }),
}));
