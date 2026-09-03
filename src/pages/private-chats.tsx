import { AppLayout } from "@/components/layout/app-layout";
import { PrivateChatList } from "@/components/private-chat-list";
import { PrivateChatRoom } from "@/components/private-chat-room";
import { Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { socketService } from "@/services/socket";
import { authApi, clearSessionState, getSessionToken } from "@/lib/auth";
import { useAuthStore as authStore } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import { useGetPrivateChats } from "@workspace/api-client-react";
import type { UserSearchResult } from "@/components/private-chat-list";
import { updateLastSeen } from "@/hooks/useSupabaseRealtime";
import { normalizeDmMessage, useDmStore } from "@/store/dmStore";
import type { DmMessage } from "@/store/dmStore";
import { apiUrl } from "@/lib/api-url";
import { drainQueuedMessages, loadQueuedMessages, queueMessage } from "@/lib/message-outbox";
import { playNotificationSound, requestNotificationPermission, showNotification } from "@/lib/notify";

type PrivateConversation = {
  id: string;
  otherUserId?: string;
  showOnlineStatus?: boolean;
  displayName: string;
  username: string;
  profilePicture?: string | null;
  lastMessage: string;
  time: string;
  lastSeen?: string | null;
  hideLastSeen?: boolean;
  unreadCount: number;
  online: boolean;
  isSelected?: boolean;
};

export type PrivateChatStatus = {
  authentication: 'authenticated' | 'connecting' | 'disconnected' | 'failed';
  join: 'joined' | 'joining' | 'failed';
  receiver: 'online' | 'offline' | 'unknown';
  message: 'idle' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
};

const initialConversations: PrivateConversation[] = [];
export default function PrivateChatsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<PrivateConversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const dmMessages = useDmStore((state) => state.messages);
  const mergeMessages = useDmStore((state) => state.mergeMessages);
  const updateMessage = useDmStore((state) => state.updateMessage);
  const markMessagesRead = useDmStore((state) => state.markMessagesRead);
  const addMessage = useDmStore((state) => state.addMessage);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    for (const queued of loadQueuedMessages(user.id)) {
      addMessage(normalizeDmMessage({
        id: queued.id,
        chatId: queued.chatId,
        senderId: queued.senderId,
        senderUsername: queued.senderUsername,
        senderName: queued.senderName,
        content: queued.content,
        timestamp: queued.timestamp,
        status: 'sending',
      }, queued.chatId));
    }
  }, [addMessage, user?.id]);
  const [connectionBanner, setConnectionBanner] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [chatStatus, setChatStatus] = useState<PrivateChatStatus>({
    authentication: 'connecting',
    join: 'joining',
    receiver: 'unknown',
    message: 'idle',
  });
  const [socketState, setSocketState] = useState(() => socketService.getState());
  const [isRouteLoaded, setIsRouteLoaded] = useState(false);
  const previousChatIdRef = useRef<string | null>(null);
  const [match, params] = useRoute('/messages/:chatId');
  const [, setLocation] = useLocation();
  const { data: privateChatsData, isLoading: conversationsLoading } = useGetPrivateChats();
  const currentUsername = user?.username ?? null;
  const currentDisplayName = user?.displayName ?? user?.username ?? '';

  useEffect(() => socketService.onStateChange(setSocketState), []);

  useEffect(() => {
    setIsJoined(socketState.roomState === 'JOINED' && socketState.room === selectedConversationId);
    setConnectionBanner(socketState.error);
    setChatStatus((previous) => ({
      ...previous,
      authentication: socketState.authState === 'SUCCESS' ? 'authenticated' : socketState.authState === 'FAILED' ? 'failed' : 'connecting',
      join: socketState.roomState === 'JOINED' ? 'joined' : socketState.roomState === 'FAILED' ? 'failed' : 'joining',
    }));
  }, [selectedConversationId, socketState]);

  const handleReadMessages = useCallback((chatId: string, messageIds: string[]) => {
    if (messageIds.length === 0) return;

    markMessagesRead(chatId, messageIds);

    if (currentUsername) {
      const socket = socketService.getSocket();
      messageIds.forEach((messageId) => socket?.emit('mark_as_read', { room: chatId, messageId }));
    }
  }, [currentUsername, user?.id, markMessagesRead]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!privateChatsData?.chats) return;
    const normalizedChats = privateChatsData.chats.map((chat) => {
      const other = chat.otherUser ?? {} as any;
      const displayName = other.displayName ?? other.username ?? 'Unknown';
      const username = other.username ?? '';

      return {
        id: chat.id,
        otherUserId: (other as { id?: string }).id,
        showOnlineStatus: (other as { showOnlineStatus?: boolean; show_online_status?: boolean }).showOnlineStatus ?? (other as { show_online_status?: boolean }).show_online_status !== false,
        displayName,
        username,
        profilePicture: other.profilePicture ?? null,
        lastMessage: "",
        time: "",
        lastSeen: other.lastSeen ?? null,
        hideLastSeen: Boolean((other as { hideLastSeen?: boolean; hide_last_seen?: boolean }).hideLastSeen ?? (other as { hideLastSeen?: boolean; hide_last_seen?: boolean }).hide_last_seen),
        unreadCount: chat.unreadCount || 0,
        online: Boolean((other as { online?: boolean }).online),
        isSelected: false,
      } as PrivateConversation;
    });
    setConversations(normalizedChats);

    if (params?.chatId && params.chatId !== selectedConversationId) {
      setSelectedConversationId(params.chatId);
    } else if (!params?.chatId && !selectedConversationId && normalizedChats.length > 0) {
      setSelectedConversationId(normalizedChats[0].id);
    }
  }, [privateChatsData, params?.chatId, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !currentUsername) return;
    setConversations((prev) => prev.map((conversation) => ({
      ...conversation,
      isSelected: conversation.id === selectedConversationId,
    })));
  }, [selectedConversationId]);

  useEffect(() => {
    if (!isRouteLoaded && match && params?.chatId) {
      setSelectedConversationId(params.chatId);
      if (isMobile) {
        setIsChatOpen(true);
      }
      setIsRouteLoaded(true);
    }
  }, [match, params, isMobile, isRouteLoaded]);

  useEffect(() => {
    const currentChatId = selectedConversationId;
    if (!currentChatId) return;

    const unsubscribeSocketErrors = socketService.onError((message) => {
      setIsJoined(false);
      setConnectionBanner(message);
      setChatStatus((previous) => ({
        ...previous,
        authentication: socketService.getAuthStatus() === 'FAILED' ? 'failed' : previous.authentication,
        join: socketService.getRoomStatus() === 'FAILED' ? 'failed' : previous.join,
      }));
    });

    let cancelled = false;
    let socket: ReturnType<typeof socketService.getSocket> | null = null;
    let reconnectHandler: (() => void) | null = null;
    const disconnectHandler = () => {
      setIsJoined(false);
      socketService.markRoomJoinPending();
      setChatStatus((previous) => ({ ...previous, authentication: 'disconnected', join: 'joining', receiver: 'unknown' }));
    };
    const onUserOnline = ({ userId }: { userId?: string }) => {
      if (!userId) return;
      setConversations((previous) => previous.map((conversation) => conversation.otherUserId === userId ? { ...conversation, online: true } : conversation));
    };
    const onUserOffline = ({ userId }: { userId?: string }) => {
      if (!userId) return;
        setConversations((previous) => previous.map((conversation) => conversation.otherUserId === userId ? { ...conversation, online: false } : conversation));
      };
      const onPresenceHidden = ({ userId }: { userId?: string }) => {
        if (!userId) return;
        setConversations((previous) => previous.map((conversation) => conversation.otherUserId === userId ? { ...conversation, online: false, showOnlineStatus: false } : conversation));
    };

    const onPrivateMessage = (rawMessage: Record<string, unknown>) => {
      const messageChatId = typeof rawMessage.chatId === 'string'
        ? rawMessage.chatId
        : typeof rawMessage.room === 'string' ? rawMessage.room : '';
      if (messageChatId !== currentChatId) return;
      const normalized = normalizeDmMessage(rawMessage, currentChatId);
      if (normalized.senderId === user?.id || normalized.senderUsername === currentUsername) return;
      mergeMessages([normalized]);
      playNotificationSound();
      showNotification(normalized.senderName || normalized.senderUsername || 'New message', normalized.content || 'New message', `/Uchat/messages/${currentChatId}`);
    };

    const joinChat = async () => {
      setIsJoined(false);
      setChatStatus((previous) => ({ ...previous, authentication: 'connecting', join: 'joining', receiver: 'unknown' }));
      const authenticatedSocket = await socketService.ensureAuthenticated();
      if (!authenticatedSocket?.connected || !getSessionToken() || cancelled) {
        setChatStatus((previous) => ({ ...previous, authentication: 'failed', join: 'failed' }));
        setConnectionBanner('Socket authentication failed. Retry without leaving this chat.');
        return;
      }
      setChatStatus((previous) => ({ ...previous, authentication: 'authenticated' }));
      socket = authenticatedSocket;

      const doJoin = (socketToUse: NonNullable<typeof socket>) => {
        if (cancelled || !selectedConversationId) return;
        void socketService.joinRoom(selectedConversationId);
        previousChatIdRef.current = selectedConversationId;
      };

      doJoin(authenticatedSocket);
      reconnectHandler = () => {
        if (cancelled) return;
        void (async () => {
          const reconnectedSocket = await socketService.ensureAuthenticated();
          if (!reconnectedSocket || cancelled) return;
          socket = reconnectedSocket;
          if (user?.id) {
            await drainQueuedMessages(user.id, (queued) => new Promise<boolean>((resolve) => {
              reconnectedSocket.emit('join_room', { room: queued.chatId }, (joinResponse: { ok?: boolean }) => {
                if (joinResponse?.ok === false) { resolve(false); return; }
                reconnectedSocket.emit('send_message', { room: queued.chatId, content: queued.content, clientMessageId: queued.id }, (response: { ok?: boolean; message?: Record<string, unknown> }) => {
                  if (response?.ok && response.message) {
                    updateMessage(queued.id, { ...normalizeDmMessage(response.message, queued.chatId), status: 'sent', _pendingKey: queued.id });
                    resolve(true);
                  } else resolve(false);
                });
              });
            }));
          }
          const token = getSessionToken();
          const lastMessage = dmMessages
            .filter((message) => message.chatId === selectedConversationId)
            .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
            .slice(-1)[0];
          const lastSyncedAt = lastMessage?.timestamp ?? new Date(0).toISOString();
          try {
            const syncResponse = await fetch(apiUrl(`/messages/sync?chat_id=${encodeURIComponent(selectedConversationId)}&last_synced_at=${encodeURIComponent(lastSyncedAt)}`), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (syncResponse.ok) {
              const syncedMessages = await syncResponse.json();
              if (Array.isArray(syncedMessages)) {
                mergeMessages(syncedMessages.map((message: any) => normalizeDmMessage(message, selectedConversationId)));
              }
            }
          } catch {
            // The regular chat refresh below remains the fallback sync path.
          }
          doJoin(reconnectedSocket);
          await refreshMessagesForChat(selectedConversationId);
        })();
      };

      socket.on('user_online', onUserOnline);
      socket.on('user_offline', onUserOffline);
      socket.on('presence_hidden', onPresenceHidden);
      requestNotificationPermission();
      socket.on('message_received', onPrivateMessage);
      socket.on('new_message', onPrivateMessage);

      socket.on('connect', reconnectHandler);
      socket.on('reconnect', reconnectHandler);
      socket.on('disconnect', disconnectHandler);
    };

    void joinChat();

    return () => {
      cancelled = true;
      unsubscribeSocketErrors();
      if (socket && reconnectHandler) {
        socket.off('connect', reconnectHandler);
        socket.off('reconnect', reconnectHandler);
      }
      socket?.off('user_online', onUserOnline);
      socket?.off('user_offline', onUserOffline);
      socket?.off('presence_hidden', onPresenceHidden);
      socket?.off('message_received', onPrivateMessage);
      socket?.off('new_message', onPrivateMessage);
      socket?.off('disconnect', disconnectHandler);
      if (currentChatId) {
        socketService.leaveRoom(currentChatId);
      }
      setIsJoined(false);
      previousChatIdRef.current = null;
    };
  }, [joinAttempt, mergeMessages, selectedConversationId, toast, updateMessage, user?.id]);

  const handleSelectConversation = (conversationId: string) => {
    const exists = conversations.some((conversation) => conversation.id === conversationId);
    if (!exists) {
      toast({ title: "Chat not found", description: "The requested conversation is unavailable." });
      return;
    }

    setSelectedConversationId(conversationId);
    setConversations((prev) => prev.map((conversation) => ({ ...conversation, isSelected: conversation.id === conversationId })));
    setLocation(`/messages/${conversationId}`);
    if (isMobile) {
      setIsChatOpen(true);
    }
  };

  const getPrivateChatId = (otherUserId: string) => {
    if (!user?.id) return null;
    return `chat-${[user.id, otherUserId].sort().join('-')}`;
  };

  const ensureConversation = async (user: UserSearchResult) => {
    // Try to get canonical chatId from server when possible
    let chatId: string | null = getPrivateChatId(user.id);
    if (!chatId) {
      try {
          const token = getSessionToken();
          const res = await fetch(apiUrl('/private-chats'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-username': currentUsername ?? '', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ otherUsername: user.username }),
          });
        if (res.ok) {
          const body = await res.json();
          chatId = body.chatId ?? null;
        }
      } catch (e) {
        // ignore and fallback
      }
    }
    if (!chatId) {
      // fallback to local id generation
      chatId = `c${Date.now()}`;
    }
    const existing = conversations.find((conversation) => conversation.id === chatId || conversation.username === user.username);
    if (existing) {
      handleSelectConversation(existing.id);
      return existing.id;
    }

    const newConversation: PrivateConversation = {
      id: chatId,
      displayName: user.displayName,
      username: user.username,
      lastMessage: "Start the conversation",
      time: "Now",
      unreadCount: 0,
      online: user.online,
      isSelected: true,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversationId(newConversation.id);
    setLocation(`/messages/${newConversation.id}`);
    if (isMobile) {
      setIsChatOpen(true);
    }
    return newConversation.id;
  };

  const handleStartChat = async (user: UserSearchResult) => {
    await ensureConversation(user);
  };

  const handleAcceptedRequest = (user: UserSearchResult) => {
    ensureConversation(user);
    toast({ title: "Friend added", description: `You can chat with ${user.displayName} now.` });
  };

  const handleSendMessage = async (content: string, replyTo?: string | null, attachments?: DmMessage['attachments']) => {
    if (!selectedConversationId) return false;
    setChatStatus((previous) => ({ ...previous, message: 'pending' }));
    if (!currentUsername) {
      toast({ title: 'Unable to send message', description: 'You are not authenticated.' });
      return false;
    }

    const pendingKey = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `local-${Date.now()}`;
    const optimisticMessage: DmMessage = {
      id: pendingKey,
      _pendingKey: pendingKey,
      chatId: selectedConversationId,
      senderId: user?.id ?? '',
      senderUsername: currentUsername,
      senderName: currentDisplayName,
      content,
      attachments,
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    addMessage(optimisticMessage);
    if (!isJoined) {
      if (user?.id) queueMessage(user.id, { id: pendingKey, chatId: selectedConversationId, content, senderId: user.id, senderUsername: currentUsername, senderName: currentDisplayName, timestamp: optimisticMessage.timestamp });
      setChatStatus((previous) => ({ ...previous, message: 'pending' }));
      return true;
    }

    const socket = await socketService.ensureAuthenticated();
    if (!socket) {
      if (user?.id) queueMessage(user.id, { id: pendingKey, chatId: selectedConversationId, content, senderId: user.id, senderUsername: currentUsername, senderName: currentDisplayName, timestamp: optimisticMessage.timestamp });
      return true;
    }

    if (user?.id) await updateLastSeen(user.id, new Date());

    setConversations((prev) => prev.map((conversation) => (conversation.id === selectedConversationId ? { ...conversation, lastMessage: content, time: "Now" } : conversation)));

    socket.emit('send_message', { room: selectedConversationId, content, attachments, clientMessageId: pendingKey }, (resp: any) => {
      if (!resp) return;
      if (resp.ok) {
        const sentMessage = resp.message ?? {};
        updateMessage(pendingKey, {
          ...normalizeDmMessage(sentMessage, selectedConversationId),
          status: 'sent',
          _pendingKey: pendingKey,
        });
        setChatStatus((previous) => ({
          ...previous,
          message: 'sent',
        }));
      } else {
        updateMessage(pendingKey, { status: 'failed' });
        setChatStatus((previous) => ({ ...previous, message: 'failed' }));
        toast({ title: 'Message failed', description: resp.message ?? resp.code ?? 'Unable to send message' });
      }
    });

    return true;
  };

  const handleResendMessage = async (messageId: string) => {
    if (!selectedConversationId) return false;
    const message = dmMessages.find((item) => item.id === messageId && item.chatId === selectedConversationId);
    const socket = socketService.getSocket();
    if (!message || !socket) return false;

    updateMessage(messageId, { status: 'sending', _pendingKey: messageId });

    socket.emit('send_message', { room: selectedConversationId, content: message.content });

    return true;
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedConversationId) return;

    updateMessage(messageId, { unsent: true, content: 'This message was deleted' });
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!selectedConversationId) return;
    updateMessage(messageId, { content: newContent });
    // emit to backend for persistence/broadcast
    socketService.getSocket()?.emit('edit_message', { messageId, newMessage: newContent, chatId: selectedConversationId });
  };

  const handleToggleStar = (messageId: string) => {
    if (!selectedConversationId) return;
    const currentMessage = dmMessages.find((item) => item.id === messageId);
    updateMessage(messageId, { starred: !currentMessage?.starred });
    socketService.getSocket()?.emit('toggle_star', { messageId, chatId: selectedConversationId });
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!selectedConversationId) return;
    const currentMessage = dmMessages.find((item) => item.id === messageId);
    const reactions = { ...(currentMessage?.reactions ?? {}) };
    reactions[emoji] = (reactions[emoji] ?? 0) + 1;
    updateMessage(messageId, { reactions });
    socketService.getSocket()?.emit('react_message', { messageId, emoji, chatId: selectedConversationId });
  };

  const refreshMessagesForChat = useCallback(async (chatId: string) => {
    if (!chatId) return;
    const controller = new AbortController();
    setMessagesLoading(true);

    try {
      const token = getSessionToken();
          const res = await fetch(apiUrl(`/private-chats/${encodeURIComponent(chatId)}/messages`), {
        headers: { 'x-username': currentUsername ?? '', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        signal: controller.signal,
      });

      if (res.status === 401) {
        const refreshed = await authApi.me();
        authStore.getState().setUser(refreshed);
        const token2 = getSessionToken();
            const retry = await fetch(apiUrl(`/private-chats/${encodeURIComponent(chatId)}/messages`), {
          headers: { 'x-username': refreshed.username ?? '', ...(token2 ? { Authorization: `Bearer ${token2}` } : {}) },
          signal: controller.signal,
        });
        if (!retry.ok) {
          if (retry.status === 404) {
            return;
          }
          throw new Error(`Unable to load messages (${retry.status})`);
        }
        const data = await retry.json();
        if (data?.messages) {
          mergeMessages((Array.isArray(data.messages) ? data.messages : []).map((message: any) => normalizeDmMessage(message, chatId)));
        }
        return;
      }

      if (res.status === 404) {
        return;
      }

      if (!res.ok) throw new Error(`Unable to load messages (${res.status})`);
      const data = await res.json();
      if (data?.messages) {
        mergeMessages((Array.isArray(data.messages) ? data.messages : []).map((message: any) => normalizeDmMessage(message, chatId)));
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        let errorMessage = error.message || 'Please try again.';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
          errorMessage = 'Unable to connect. Please check your internet connection.';
        }
        toast({ title: 'Unable to load chat', description: errorMessage });
      }
    } finally {
      setMessagesLoading(false);
    }
  }, [currentUsername, mergeMessages, toast]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void refreshMessagesForChat(selectedConversationId);
  }, [selectedConversationId, refreshMessagesForChat]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const activeMessages = useMemo(() => (selectedConversation ? dmMessages.filter((message) => message.chatId === selectedConversation.id) : []), [dmMessages, selectedConversation]);

  useEffect(() => {
    if (!selectedConversation || !isJoined) return;
    setChatStatus((previous) => ({ ...previous, receiver: selectedConversation.online ? 'online' : 'offline' }));
  }, [selectedConversation?.id, selectedConversation?.online, isJoined]);

  const showRoom = !isMobile || (isMobile && isChatOpen && Boolean(selectedConversation));
  const retryJoin = useCallback(() => {
    void socketService.retry().finally(() => {
      setJoinAttempt((attempt) => attempt + 1);
    });
  }, []);

  const handleHardReset = useCallback(() => {
    clearSessionState();
    socketService.cleanup();
    useAuthStore.getState().reset();
    setLocation('/login');
  }, [setLocation]);

  return (
    <AppLayout hideBottomNav={isMobile && isChatOpen}>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className={`${isMobile && showRoom ? "hidden" : "block"} w-full border-b border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90 lg:block lg:w-80 lg:border-b-0 lg:border-r`}>
            <PrivateChatList
              conversations={conversations}
              conversationsLoading={conversationsLoading}
              onSelectConversation={handleSelectConversation}
              onStartChat={handleStartChat}
              onAcceptedRequest={handleAcceptedRequest}
            />
          </section>

          <section className={`${isMobile ? (showRoom ? "fixed inset-0 z-30" : "hidden") : "flex"} min-h-0 flex-1 bg-white/90 dark:bg-gray-900/90 lg:flex`}>
            <div className="flex min-h-0 flex-1 flex-col">
              {selectedConversation ? (
                <PrivateChatRoom
                  conversation={selectedConversation}
                  messages={activeMessages}
                  messagesLoading={messagesLoading}
                  currentUsername={currentUsername ?? ''}
                  onBack={() => setIsChatOpen(false)}
                  onSendMessage={handleSendMessage}
                  onResendMessage={handleResendMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onToggleStar={handleToggleStar}
                  onReact={handleReact}
                  onReadMessages={handleReadMessages}
                  connectionBanner={connectionBanner}
                  onRetry={retryJoin}
                  onHardReset={handleHardReset}
                  isJoined={isJoined}
                  chatStatus={chatStatus}
                />
              ) : (
                <div className="flex min-h-[40vh] flex-1 items-center justify-center p-6 text-center">
                  <div className="max-w-sm space-y-4 rounded-3xl border border-purple-200 bg-purple-50/90 p-8 shadow-sm shadow-purple-100 dark:border-purple-900/40 dark:bg-purple-950/50">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-600 text-white">
                      <Send className="h-10 w-10" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Uchat</h2>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Never miss an update.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

