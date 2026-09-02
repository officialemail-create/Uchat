export type Reaction = { emoji: string; count: number; users: string[] }

export type Message = {
  id: string
  senderName: string
  message: string
  timestamp: string
  unsent?: boolean
  voiceNote?: boolean
  voiceDuration?: number | null
  replyTo?: string | null
  replyToMessage?: string | null
  replyToSender?: string | null
  edited?: boolean
  attachments?: Array<{ objectPath: string; fileName: string; fileSize: number; mimeType: string }>
  reactions?: Reaction[]
}

export type PrivateMessage = Message & {
  chatId: string
  otherUser: { id: string; username: string; displayName: string }
}

export type RoomMessage = Message & {
  roomId: string
}

export type RoomMember = {
  id: string
  username: string
  displayName: string
  online: boolean
}

export type UserPresence = {
  online: boolean
  lastSeen?: string
}

export type Room = {
  id: string
  name: string
  description?: string
  privacy?: "public" | "private"
  ownerId?: string
  roomCode?: string
  createdAt?: string
  memberCount: number
  isMember: boolean
  isOwner?: boolean
}

export type Chat = {
  id: string
  otherUser: {
    id: string
    username: string
    displayName: string
    profilePicture?: string | null
    lastSeen?: string | null
    hideLastSeen?: boolean
  }
  unreadCount?: number
}

export type SearchUser = {
  id: string
  username: string
  displayName: string
  relationship?: 'none' | 'pending' | 'friend' | 'self'
  online?: boolean
  profilePicture?: string | null
}

export type MessageStats = {
  onlineCount: number
  totalMessages: number
  activeRooms: number
}

export type RoomsResponse = {
  rooms: Room[]
}

export type DmsResponse = {
  chats: Chat[]
}

import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiUrl } from '@/lib/api-url'
import { getSessionToken } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'

const buildHeaders = (token?: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

const requestJson = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const token = getSessionToken();
  const currentUsername = typeof window !== 'undefined'
    ? localStorage.getItem('uchat_username')
      ?? sessionStorage.getItem('uchat_username')
      ?? useAuthStore.getState().user?.username
      ?? ''
    : '';
  const headers = {
    ...buildHeaders(token),
    ...(currentUsername ? { 'x-username': currentUsername } : {}),
    ...(options?.headers ?? {}),
  };
  const res = await fetch(apiUrl(path), {
    credentials: 'include',
    headers,
    ...options,
  })
  const text = await res.text()
  let json: Record<string, unknown> = {}
  try { json = JSON.parse(text) } catch {}
  if (!res.ok) throw new Error((json.error as string) ?? "Something went wrong. Please try again.")
  return json as T
}

export const useGetMessages = (opts?: { limit?: number }) =>
  useQuery({
    queryKey: ['messages', opts?.limit ?? 100],
    queryFn: () => requestJson<{ messages: Message[]; hasMore: boolean }>(`/messages?limit=${opts?.limit ?? 100}`),
  })

export const useGetMessageStats = () =>
  useQuery({
    queryKey: ['messages', 'stats'],
    queryFn: () => requestJson<MessageStats>('/messages/stats'),
  })

export const useCreateRoom = () => {
  return useMutation({
    mutationFn: (vars: { data: { name: string; description?: string; privacy: 'public' | 'private' } }) =>
      requestJson<Room>('/rooms', { method: 'POST', body: JSON.stringify(vars.data) }),
  })
}

export const useGetRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => requestJson<{ rooms: Room[] }>('/rooms'),
  })
}

export const useGetPrivateChats = () => {
  return useQuery({
    queryKey: ['privateChats'],
    queryFn: () => requestJson<DmsResponse>('/private-chats'),
  });
}

export const getFriendRequests = (status?: string) => requestJson<{ requests: Array<{ id: string; senderId: string; receiverId: string; status: string; sender?: SearchUser | null; receiver?: SearchUser | null; createdAt: string }> }>(
  `/friends/requests${status ? `?status=${encodeURIComponent(status)}` : ''}`,
)

export const useSearchUsers = (params?: { q?: string }, opts?: { query?: { enabled?: boolean } }) => {
  const query = params?.q ?? ''
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => requestJson<{ users: SearchUser[] }>(`/users/search?q=${encodeURIComponent(query)}`),
    enabled: opts?.query?.enabled ?? query.length > 1,
  })
}

export const useStartPrivateChat = () => {
  return useMutation({
    mutationFn: (vars: { targetUserId: string }) => requestJson<Chat>('/private-chats/start', { method: 'POST', body: JSON.stringify({ targetUserId: vars.targetUserId }) }),
  })
}

export const sendFriendRequest = (targetUserOrId: string | { targetUserId: string; targetUsername?: string }) => {
  const payload = typeof targetUserOrId === 'string'
    ? { targetUserId: targetUserOrId }
    : targetUserOrId;

  return requestJson<{ message: string; request: unknown }>(
    '/friends/requests',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export const acceptFriendRequest = (requestId: string) => requestJson<{ message: string; chat: { id: string } }>(
  `/friends/requests/${requestId}/accept`,
  { method: 'POST' },
)

export const declineFriendRequest = (requestId: string) => requestJson<{ message: string }>(
  `/friends/requests/${requestId}/decline`,
  { method: 'POST' },
)

export const cancelFriendRequest = (requestId: string) => requestJson<{ message: string }>(
  `/friends/requests/${requestId}`,
  { method: 'DELETE' },
)

export const useGetLinkPreview = (_opts?: any) => React.useMemo(() => ({ mutate: (_vars: unknown) => {}, isLoading: false }), [])

export const useDiscoverRooms = (params?: { search?: string }) => {
  const search = params?.search ?? ''
  return useQuery({
    queryKey: ['rooms', 'discover', search],
    queryFn: () => requestJson<{ rooms: Room[] }>(`/rooms/discover${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  })
}

export const useJoinRoom = () => {
  return useMutation({
    mutationFn: ({ roomId }: { roomId: string }) => requestJson<{ message: string }>(`/rooms/${roomId}/join`, { method: 'POST' }),
  })
}

export const useJoinRoomByCode = () => {
  return useMutation({
    mutationFn: ({ data }: { data: { roomCode: string } }) => requestJson<Room>('/rooms/join-code', { method: 'POST', body: JSON.stringify(data) }),
  })
}
export const getGetRoomsQueryKey = () => ['rooms'] as const
export const getGetPrivateChatsQueryKey = () => ['privateChats'] as const
