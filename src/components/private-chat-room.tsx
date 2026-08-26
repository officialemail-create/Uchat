import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Check, CheckCheck, Clock3, Lock, MoreVertical, RotateCw } from "lucide-react";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi, resolveAvatarUrl } from "@/lib/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/store/authStore";
import { Virtuoso } from "react-virtuoso";
import { MessageContextMenu } from "@/components/message-context-menu";
import { useReadReceipts } from "@/hooks/use-read-receipts";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGetPrivateChats } from "@/workspace/api-client-react";
import { socketService } from "@/services/socket";
import type { DmMessage } from "@/store/dmStore";
import { SkeletonBubble } from "@/components/skeletons";
import VoiceMessageBubble from "@/components/voice-message-bubble";

const ChatInput = lazy(() => import("@/components/private-chat-input").then((module) => ({ default: module.ChatInput })));

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export function isPrivateChatMessageForConversation(message: any, conversationId: string) {
  if (!message || typeof message !== 'object') return false;

  const rawChatId = typeof message.chatId === 'string' ? message.chatId : undefined;
  if (rawChatId && rawChatId !== conversationId) {
    return false;
  }

  const hasText = typeof message.content === 'string';
  if (!hasText && !message.id) return false;
  return true;
}

export function shouldHandlePrivateChatMessage(message: any, conversationId: string) {
  if (!message || typeof message !== 'object') return false;

  const rawChatId = typeof message.chatId === 'string' ? message.chatId : undefined;
  if (rawChatId && rawChatId !== conversationId) {
    return false;
  }

  const hasText = typeof message.content === 'string';
  if (!hasText && !message.id) return false;
  return true;
}

export type PrivateMessageItem = DmMessage;

type PrivateConversation = {
  id: string;
  displayName: string;
  username: string;
  profilePicture?: string | null;
  lastMessage: string;
  time: string;
  lastSeen?: string | null;
  hideLastSeen?: boolean;
  unreadCount: number;
  online: boolean;
  showOnlineStatus?: boolean;
  isSelected?: boolean;
};

interface PrivateChatRoomProps {
  conversation: PrivateConversation | null;
  messages: PrivateMessageItem[];
  messagesLoading?: boolean;
  currentUsername: string;
  onBack: () => void;
  onSendMessage: (content: string, replyTo?: string | null) => Promise<boolean>;
  onResendMessage: (messageId: string) => Promise<boolean>;
  onDeleteMessage: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onToggleStar?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReadMessages?: (chatId: string, messageIds: string[]) => void;
  connectionBanner?: string | null;
  onRetry?: () => void;
  onHardReset?: () => void;
  isJoined: boolean;
  chatStatus: {
    authentication: 'authenticated' | 'connecting' | 'disconnected' | 'failed';
    join: 'joined' | 'joining' | 'failed';
    receiver: 'online' | 'offline' | 'unknown';
    message: 'idle' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  };
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  isVisible,
  onRead,
  messageRef,
  onContextMenu,
  onLongPress,
  onResend,
}: {
  message: PrivateMessageItem;
  isMine: boolean;
  isVisible: boolean;
  onRead: (messageId: string) => void;
  messageRef: (element: HTMLDivElement | null) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, message: PrivateMessageItem) => void;
  onLongPress?: (message: PrivateMessageItem) => void;
  onResend?: (message: PrivateMessageItem) => void;
}) {
  useReadReceipts(message.id, isVisible && !isMine && message.status !== "sending", onRead);

  const statusIcon =
    message.status === "sending" ? <Clock3 className="h-3.5 w-3.5 text-gray-400" /> :
    message.status === "sent" ? <Check className="h-3.5 w-3.5 text-white/80" /> :
    message.status === "delivered" ? <CheckCheck className="h-3.5 w-3.5 text-white/80" /> :
    message.status === "read" ? <CheckCheck className="h-3.5 w-3.5 text-purple-200" /> :
    <CheckCheck className="h-3.5 w-3.5 text-red-300" />;

  return (
    <div ref={messageRef} data-message-id={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-0 py-0 ${isMine ? "rounded-br-none bg-purple-600 text-white shadow-sm" : "rounded-bl-none border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"} ${isMine && message.status === "failed" ? "border border-red-400 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900/40" : ""}`}
        onContextMenu={(event) => onContextMenu(event, message)}
        onTouchStart={(event) => {
          const timer = window.setTimeout(() => onLongPress?.(message), 450);
          event.currentTarget.dataset.timer = String(timer);
        }}
        onTouchEnd={(event) => {
          const timer = Number((event.currentTarget as HTMLDivElement).dataset.timer);
          if (!Number.isNaN(timer)) window.clearTimeout(timer);
        }}
        onTouchCancel={(event) => {
          const timer = Number((event.currentTarget as HTMLDivElement).dataset.timer);
          if (!Number.isNaN(timer)) window.clearTimeout(timer);
        }}
      >
        <div className="p-3">
          {message.kind === "image" && message.attachmentUrl ? (
            <div className="overflow-hidden rounded-xl border border-purple-200 dark:border-purple-700">
              <img src={message.attachmentUrl} alt={message.attachmentName || "Shared image"} loading="lazy" className="max-h-64 w-full object-cover" />
            </div>
          ) : null}

          {message.content && message.kind !== "voice" ? <p className={`break-words text-base leading-relaxed tracking-tight ${isMine ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>{message.content}</p> : null}

          {message.kind === "voice" && message.attachmentUrl ? (
            <div className="w-full">
              <VoiceMessageBubble src={message.attachmentUrl} duration={message.voiceDuration} isMine={isMine} className={isMine ? "border-purple-300/70 bg-purple-600/15" : "border-purple-200 bg-purple-50/80 dark:border-purple-700 dark:bg-purple-950/20"} />
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {message.reactions ? (
                <div className="flex items-center gap-2">
                  {Object.entries(message.reactions).map(([emoji, count]) => (
                    <div key={emoji} className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs">
                      <span>{emoji}</span>
                      <span className="text-muted">{count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={`flex items-center gap-1 text-xs font-mono ${isMine ? "text-purple-100" : "text-gray-400 dark:text-gray-500"}`}>
              <span>{formatTimestamp(message.timestamp)}</span>
              {isMine ? <span data-message-status={message.status} aria-label={`Message status: ${message.status}`}>{statusIcon}</span> : null}
              {message.starred ? <span className="ml-1 text-amber-400">★</span> : null}
            </div>
          </div>
        </div>
      </div>

      {isMine && message.status === "failed" ? (
        <button type="button" aria-label="Resend message" onClick={() => onResend?.(message)} className="ml-2 self-end rounded-full bg-red-50 p-2 text-red-600 dark:bg-red-950/40">
          <RotateCw className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
});

interface MessageListProps {
  messages: PrivateMessageItem[];
  currentUserId: string;
  currentUsername: string;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onReadMessages: (messageIds: string[]) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, message: PrivateMessageItem) => void;
  onLongPress: (message: PrivateMessageItem) => void;
  onResend: (message: PrivateMessageItem) => void;
}

function MessageList({ messages, currentUserId, currentUsername, viewportRef, onReadMessages, onContextMenu, onLongPress, onResend }: MessageListProps) {
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const readMessageIdsRef = useRef(new Set<string>());
  const pendingReadIdsRef = useRef(new Set<string>());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(new Set());

  const setMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (element) messageRefs.current.set(messageId, element);
    else messageRefs.current.delete(messageId);
  }, []);

  const flushReads = useCallback(() => {
    flushTimerRef.current = null;
    if (pendingReadIdsRef.current.size === 0) return;
    const messageIds = Array.from(pendingReadIdsRef.current);
    pendingReadIdsRef.current.clear();
    onReadMessages(messageIds);
  }, [onReadMessages]);

  const queueRead = useCallback((messageId: string) => {
    if (readMessageIdsRef.current.has(messageId)) return;
    readMessageIdsRef.current.add(messageId);
    pendingReadIdsRef.current.add(messageId);
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushReads, 100);
    }
  }, [flushReads]);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleMessageIds((previous) => {
          const next = new Set(previous);
          entries.forEach((entry) => {
            const messageId = (entry.target as HTMLElement).dataset.messageId;
            if (!messageId) return;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) next.add(messageId);
            else next.delete(messageId);
          });
          return next;
        });
      },
      { root, threshold: 0.5 },
    );

    const unreadMessages = messages.filter((message) => message.senderId !== currentUserId && message.senderUsername !== currentUsername && message.status !== "read");
    const initialTargets = unreadMessages.slice(-5);
    initialTargets.forEach((message) => {
      const element = messageRefs.current.get(message.id);
      if (element) observer.observe(element);
    });

    const observeUnreadMessages = () => {
      unreadMessages.forEach((message) => {
        const element = messageRefs.current.get(message.id);
        if (element) observer.observe(element);
      });
    };

    root.addEventListener("scroll", observeUnreadMessages, { passive: true });
    return () => {
      root.removeEventListener("scroll", observeUnreadMessages);
      observer.disconnect();
    };
  }, [currentUserId, currentUsername, messages, viewportRef]);

  useEffect(() => () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  }, []);

  const renderMessage = (message: PrivateMessageItem) => {
    const isMine = message.senderId === currentUserId || message.senderUsername === currentUsername;
    return (
      <MessageBubble
        key={message.id}
        message={message}
        isMine={isMine}
        isVisible={visibleMessageIds.has(message.id)}
        onRead={queueRead}
        messageRef={(element) => setMessageRef(message.id, element)}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        onResend={onResend}
      />
    );
  };

  if (messages.length > 50) {
    return (
      <Virtuoso
        style={{ height: "100%" }}
        data={messages}
        followOutput="auto"
        itemContent={(_index, message) => renderMessage(message)}
      />
    );
  }

  return <>{messages.map(renderMessage)}</>;
}

export function PrivateChatRoom({ conversation, messages, messagesLoading = false, currentUsername, onBack, onSendMessage, onResendMessage, onDeleteMessage, onEditMessage, onToggleStar, onReact, onReadMessages, connectionBanner, onRetry, onHardReset, isJoined, chatStatus }: PrivateChatRoomProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { data: privateChatsData } = useGetPrivateChats();
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ content: string } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; messageId: string | null }>({ open: false, x: 0, y: 0, messageId: null });
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [connectionIndicator, setConnectionIndicator] = useState<string | null>(connectionBanner ?? null);
  const [onlineState, setOnlineState] = useState(conversation?.online ?? false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const scrollToBottom = useCallback(() => {
    if (!viewportRef.current) return;
    requestAnimationFrame(() => {
      const el = viewportRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
    const retryTimers = [0, 100, 300].map((delay) => window.setTimeout(scrollToBottom, delay));
    return () => retryTimers.forEach((timer) => window.clearTimeout(timer));
  }, [messages.length, messagesLoading, conversation?.id, scrollToBottom]);

  if (!conversation) {
    return null;
  }

  const avatarUrl = resolveAvatarUrl(conversation.profilePicture ?? null);

  useEffect(() => {
    setOnlineState(Boolean(conversation.online));
  }, [conversation.online]);

  useEffect(() => {
    if (!conversation?.id || !currentUsername) return;

    const emitTyping = (isTyping: boolean) => {
      socketService.getSocket()?.emit('dm_typing', {
        chatId: conversation.id,
        username: currentUsername,
        isTyping,
      });
    };

    if (draft.trim().length > 0) {
      emitTyping(true);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => emitTyping(false), 1500);
    } else {
      emitTyping(false);
    }

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
      emitTyping(false);
    };
  }, [conversation?.id, currentUsername, draft]);

  useEffect(() => {
    if (!connectionBanner) {
      setConnectionIndicator(null);
      return;
    }

    setConnectionIndicator(connectionBanner);
    const timer = window.setTimeout(() => setConnectionIndicator(null), 2600);
    return () => window.clearTimeout(timer);
  }, [connectionBanner]);

  const statusText = useMemo(() => {
    if (!conversation) return "Offline";
    return conversation.showOnlineStatus === false ? null : (onlineState ? "Online" : "Offline");
  }, [conversation, onlineState]);

  const handleSend = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (editingMessageId) {
      onEditMessage?.(editingMessageId, trimmed);
      setEditingMessageId(null);
      setDraft("");
      setReplyingTo(null);
      return;
    }

    const success = await onSendMessage(trimmed, replyingTo?.content ?? null);
    setDraft("");
    setReplyingTo(null);
    if (!success) {
      setConnectionIndicator("Connection lost. Retrying...");
    }
  };

  const handleUpload = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const content = isImage ? "Shared an image" : `Shared ${file.name}`;
    await onSendMessage(content);
  };

  const handleCameraUpload = async (file: File) => {
    await handleUpload(file);
  };

  const handleVoiceSend = async (audioBlob: Blob, durationMs: number, mimeType: string) => {
    if (!conversation?.id) return;
    try {
      const uploaded = await authApi.uploadVoiceNote(audioBlob, mimeType);
      const socket = await socketService.ensureAuthenticated();
      if (!socket) throw new Error("Socket authentication failed");
      socket.emit("send_voice_note", {
        room: conversation.id,
        audioUrl: uploaded.audioUrl,
        duration: durationMs,
        mimeType,
        size: audioBlob.size,
        clientMessageId: crypto.randomUUID(),
      });
    } catch (error) {
      toast({ title: "Voice note failed", description: error instanceof Error ? error.message : "Unable to send voice note", variant: "destructive" });
    }
  };

  const handleResend = async (message: PrivateMessageItem) => {
    const success = await onResendMessage(message.id);
    if (!success) {
      setConnectionIndicator("Connection lost. Retrying...");
    }
  };

  const clearContextMenu = () => setContextMenu({ open: false, x: 0, y: 0, messageId: null });

  const handleReply = () => {
    if (!contextMenu.messageId) return;
    const activeMessage = messages.find((message) => message.id === contextMenu.messageId);
    if (!activeMessage) return;
    setReplyingTo({ content: activeMessage.content });
    clearContextMenu();
  };

  const handleCopy = () => {
    if (!contextMenu.messageId) return;

    const activeMessage = messages.find((message) => message.id === contextMenu.messageId);
    if (!activeMessage) return;

    navigator.clipboard.writeText(activeMessage.content ?? "");
    toast({ title: "Copied!", description: "Message text copied to clipboard." });
    clearContextMenu();
  };

  const handleDeleteForMe = () => {
    if (!contextMenu.messageId) return;
    onDeleteMessage(contextMenu.messageId);
    clearContextMenu();
  };

  const handleDeleteForEveryone = () => {
    if (!contextMenu.messageId || !conversation) return;
    socketService.getSocket()?.emit("delete_private_message", {
      messageId: contextMenu.messageId,
      chatId: conversation.id,
      forEveryone: true,
    });
    clearContextMenu();
  };

  const handleForward = () => {
    if (!contextMenu.messageId) return;
    setForwardingMessageId(contextMenu.messageId);
    setForwardDialogOpen(true);
    clearContextMenu();
  };

  const handleForwardTarget = (targetChatId: string) => {
    if (!forwardingMessageId || !conversation) return;
    socketService.getSocket()?.emit("forward_private_message", {
      messageId: forwardingMessageId,
      sourceChatId: conversation.id,
      targetChatId,
    });
    toast({ title: "Message forwarded", description: "Your message was sent to the selected chat." });
    setForwardDialogOpen(false);
    setForwardingMessageId(null);
  };

  const handleEdit = () => {
    if (!contextMenu.messageId) return;
    const activeMessage = messages.find((m) => m.id === contextMenu.messageId);
    if (!activeMessage) return;
    setDraft(activeMessage.content);
    setEditingMessageId(activeMessage.id);
    clearContextMenu();
  };

  const handleToggleStar = () => {
    if (!contextMenu.messageId) return;
    onToggleStar?.(contextMenu.messageId);
    clearContextMenu();
  };

  const handleReact = (emoji: string) => {
    if (!contextMenu.messageId) return;
    onReact?.(contextMenu.messageId, emoji);
    clearContextMenu();
  };

  const handleReadMessages = useCallback((messageIds: string[]) => {
    if (conversation?.id && messageIds.length > 0) onReadMessages?.(conversation.id, messageIds);
  }, [conversation?.id, onReadMessages]);

  return (
    <div className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <header className="z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="rounded-full p-2 text-gray-500 transition hover:bg-purple-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-purple-900/30 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-purple-100 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <UserAvatar src={avatarUrl} alt={conversation.displayName} size="md" className="h-full w-full" />
            {conversation.showOnlineStatus !== false && onlineState ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-purple-500 dark:border-gray-800" /> : null}
          </div>

          <div>
            <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{conversation.displayName}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className={onlineState ? "text-xs font-medium text-purple-600" : "text-xs font-medium text-gray-500 dark:text-gray-400"}>{statusText}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Open conversation actions" className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-gray-800">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>Block</DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {connectionIndicator ? (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
          <span>{connectionIndicator}</span>
          <div className="flex shrink-0 items-center gap-2">
            {onRetry ? <button type="button" onClick={onRetry} className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40">Retry</button> : null}
            {chatStatus.authentication === 'failed' && onHardReset ? <button type="button" onClick={onHardReset} className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40">Hard reset</button> : null}
          </div>
        </div>
      ) : null}

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-24 pt-4 space-y-1.5 scroll-smooth overscroll-contain sm:px-4 sm:pb-3 md:pb-3">
        {messagesLoading ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 py-2 transition-opacity duration-300" aria-label="Loading messages">
            <SkeletonBubble />
            <SkeletonBubble isOwn />
            <SkeletonBubble />
            <SkeletonBubble isOwn />
            <SkeletonBubble />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">Say hello to @{conversation.username}!</p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUsername={currentUsername}
            currentUserId={user?.id ?? ''}
            viewportRef={viewportRef}
            onReadMessages={handleReadMessages}
            onContextMenu={(event, message) => {
              event.preventDefault();
              setContextMenu({ open: true, x: event.clientX, y: event.clientY, messageId: message.id });
            }}
            onLongPress={(message) => setContextMenu({ open: true, x: 24, y: 24, messageId: message.id })}
            onResend={handleResend}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 isolate border-t border-gray-200 bg-white/95 md:relative md:inset-x-auto md:bottom-auto md:z-30 md:flex-shrink-0 dark:border-gray-800 dark:bg-gray-900/95">
        <Suspense fallback={null}>
          <ChatInput
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onUpload={handleUpload}
            onCameraUpload={handleCameraUpload}
            onVoiceSend={handleVoiceSend}
           isEditing={Boolean(editingMessageId)}
           onCancelEdit={() => { setEditingMessageId(null); setDraft(""); }}
           disabled={!isJoined}
          />
        </Suspense>
      </div>

      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Forward message</DialogTitle>
            <DialogDescription>Choose a chat to forward this message to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {privateChatsData?.chats?.map((chat: any) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleForwardTarget(chat.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-900 transition hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-purple-950/70"
              >
                <span>{(chat.otherUser && (chat.otherUser.displayName ?? chat.otherUser.username)) ?? 'Unknown'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Forward</span>
              </button>
            ))}
            {!privateChatsData?.chats?.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No chats available to forward to.</p>
            ) : null}
          </div>
          <DialogFooter>
            <button type="button" className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" onClick={() => setForwardDialogOpen(false)}>
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MessageContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        isOwn={Boolean(messages.find((message) => message.id === contextMenu.messageId && (message.senderId === user?.id || message.senderUsername === currentUsername)))}
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        onForward={handleForward}
        onReact={handleReact}
        onClose={clearContextMenu}
      />
    </div>
  );
}
