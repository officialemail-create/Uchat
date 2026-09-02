import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { useChatStore, type Reaction } from "@/store/chatStore";
import { socketService } from "@/services/socket";
import { useGetMessages, useGetMessageStats } from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";
import ChatHeader from "@/components/chat-header";
import ChatInput from "@/components/chat-input";
import ChatMessage from "@/components/chat-message";
import OnlineUsersPanel from "@/components/online-users-panel";
import SettingsModal from "@/components/settings-modal";
import { ArrowDown, RefreshCw, Trash2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { requestNotificationPermission, showNotification, playNotificationSound } from "@/lib/notify";
import { apiUrl } from "@/lib/api-url";
import { drainQueuedMessages, loadQueuedMessages } from "@/lib/message-outbox";

const BG = "#0B0F19";
const ACCENT = "#8B5CF6";

function toTime(ts: unknown): number {
  if (ts instanceof Date) return ts.getTime();
  return new Date(ts as string).getTime();
}

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center gap-3 my-3 px-2">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span
        className="text-[11px] px-3 py-0.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function SystemMessageRow({ content }: { content: string }) {
  return (
    <div className="flex items-center justify-center my-1.5 px-4">
      <span
        className="text-[11px] px-3 py-1 rounded-full"
        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.28)" }}
      >
        {content}
      </span>
    </div>
  );
}

/* ── Loading skeleton ── */
function MessageSkeleton({ isOwn }: { isOwn: boolean }) {
  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} mt-3`}>
      {!isOwn && (
        <div className="mr-1.5 self-end shrink-0" style={{ width: 28 }}>
          <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
      )}
      <div className={`flex flex-col gap-1.5 ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <div className="h-2.5 w-16 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        )}
        <div
          className="h-9 rounded-2xl animate-pulse"
          style={{
            width: `${110 + Math.floor(Math.random() * 80)}px`,
            background: isOwn ? "rgba(22,48,36,0.5)" : "rgba(26,31,46,0.6)",
          }}
        />
      </div>
    </div>
  );
}

const SKELETON_PATTERN = [false, true, false, false, true, false, true, true, false, true];

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col px-3 py-4 max-w-2xl mx-auto w-full">
      {SKELETON_PATTERN.map((isOwn, i) => (
        <MessageSkeleton key={i} isOwn={isOwn} />
      ))}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-12 select-none">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.12)" }}
      >
        <MessageSquare className="w-7 h-7" style={{ color: "rgba(34,197,94,0.5)" }} />
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm font-medium text-white">Space for all Uchat`s users</p>
     </div>
    </div>
  );
}

interface SysMsg { id: string; content: string; timestamp: string; }
type MsgItem = { _type: "msg"; data: Message };
type SysItem = { _type: "sys" } & SysMsg;
type ChatItem = MsgItem | SysItem;

export default function Chat() {
  const [, setLocation] = useLocation();
  const {
    messages, setMessages, prependMessages, addMessage, addPendingMessage,
    replacePendingMessage, clearPendingMessages, updateMessage, unsendMessage,
    deleteMessage, clearDeletedMessages, setOnlineCount, setTypingUsers,
    currentUsername, setCurrentUsername, setIsConnected,
    unreadMessageIds, markAsRead, avatarColor, pendingIds,
  } = useChatStore();

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialSettingsSection, setInitialSettingsSection] = useState<"account" | null>(null);
  const [systemMessages, setSystemMessages] = useState<SysMsg[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isScrolledNearBottom = useRef(true);
  const readTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const currentUsernameRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const { data: initialMessages, isLoading: messagesLoading } = useGetMessages({ limit: 100 });
  const { data: stats } = useGetMessageStats();

  /* Tab badge */
  useEffect(() => {
    const count = unreadMessageIds.length;
    document.title = count > 0 ? `(${count}) Uchat` : "Uchat";
  }, [unreadMessageIds]);

  /* Keyboard shortcut: Cmd/Ctrl + , → open settings */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const { user } = useAuthStore();

  /* Socket setup */
  useEffect(() => {
    const savedUsername = localStorage.getItem("uchat_username") || user?.username;
    if (!savedUsername) {
      setLocation("/");
      return;
    }
    setCurrentUsername(savedUsername);
    currentUsernameRef.current = savedUsername;

    if (user?.id) {
      for (const queued of loadQueuedMessages(user.id).filter((message) => message.chatId === "global")) {
        addPendingMessage({ id: `pending-${queued.id}`, senderName: queued.senderName, message: queued.content, timestamp: queued.timestamp });
      }
    }

    requestNotificationPermission();
    const socket = socketService.connect();
    const joinAndDrainQueue = async () => {
      const joined = await socketService.joinRoom("global");
      if (!joined || !user?.id) return;
      await drainQueuedMessages(user.id, (queued) => new Promise<boolean>((resolve) => {
        socket.emit("send_message", { room: "global", content: queued.content, clientMessageId: queued.id }, (response: { ok?: boolean; message?: Message }) => {
          if (!response?.ok || !response.message) { resolve(false); return; }
          useChatStore.getState().replacePendingMessage(`pending-${queued.id}`, response.message);
          resolve(true);
        });
      }));
    };

    socket.on("connect", async () => {
      setIsConnected(true);
      await joinAndDrainQueue();
    });
    socket.on("disconnect", () => { setIsConnected(false); });

    socket.on("join_error", ({ error }: { error: string }) => {
      sessionStorage.setItem("uchat_join_error", error);
      sessionStorage.setItem("uchat_prev_username", savedUsername);
      localStorage.removeItem("uchat_username");
      setCurrentUsername(null);
      setLocation("/");
    });

    const handleIncomingMessage = (msg: Message & { _pendingKey?: string }) => {
      if (msg._pendingKey) {
        const pendingId = `pending-${msg._pendingKey}`;
        const state = useChatStore.getState();
        if (state.pendingIds.has(pendingId)) {
          state.replacePendingMessage(pendingId, msg);
          return;
        }
      }
      const clientMessageId = (msg as Message & { clientMessageId?: string }).clientMessageId;
      if (clientMessageId) {
        const pendingId = `pending-${clientMessageId}`;
        if (useChatStore.getState().pendingIds.has(pendingId)) {
          useChatStore.getState().replacePendingMessage(pendingId, msg);
          return;
        }
      }
      addMessage(msg);
      if (msg.senderName !== currentUsernameRef.current && !msg.unsent) {
        playNotificationSound();
        showNotification(msg.senderName, msg.voiceNote ? "Voice note" : msg.message);
      }
      if (isScrolledNearBottom.current) {
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
    };

    socket.on("message_received", handleIncomingMessage);
    socket.on("new_message", handleIncomingMessage);

    socket.on("message_edited", ({ messageId, newMessage }: { messageId: string; newMessage: string }) => {
      updateMessage(messageId, newMessage);
    });
    socket.on("message_unsent", ({ messageId }: { messageId: string }) => {
      unsendMessage(messageId);
    });
    socket.on("message_reaction", ({ messageId, reactions: r }: { messageId: string; reactions: Reaction[] }) => {
      setReactions((prev) => { const next = new Map(prev); next.set(messageId, r); return next; });
    });
    socket.on("online_users", (users: string[]) => setOnlineUsers(users));
    socket.on("system_message", (msg: SysMsg) => setSystemMessages((prev) => [...prev, msg]));
    socket.on("online_count", (count: number) => setOnlineCount(count));
    socket.on("room_typing_update", (payload: { roomId: string | null; users: string[] }) => setTypingUsers(payload?.users ?? []));

    if (socket.connected) void joinAndDrainQueue();

    return () => {
      ["connect","disconnect","join_error","message_received","new_message","message_edited","message_unsent",
        "message_reaction","online_users","system_message","online_count","room_typing_update",
      ].forEach((ev) => socket.off(ev));
    };
  }, [setLocation, setCurrentUsername, setIsConnected, addMessage, updateMessage, unsendMessage,
    setOnlineCount, setTypingUsers, clearPendingMessages]);

  useEffect(() => {
    if (initialMessages?.messages) {
      const state = useChatStore.getState();
      const pendingMessages = state.messages.filter((message) => state.pendingIds.has(message.id));
      const historyMessages = [...initialMessages.messages].reverse();
      setMessages([...historyMessages, ...pendingMessages.filter((pending) => !historyMessages.some((message) => message.id === pending.id))]);
      setHasMore((initialMessages as { messages: Message[]; hasMore?: boolean }).hasMore ?? false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 80);
      const initReactions = new Map<string, Reaction[]>();
      for (const msg of initialMessages.messages) {
        if (msg.reactions && msg.reactions.length > 0) {
          initReactions.set(msg.id, msg.reactions as Reaction[]);
        }
      }
      if (initReactions.size > 0) setReactions(initReactions);
    }
  }, [initialMessages, setMessages]);

  useEffect(() => {
    if (stats?.onlineCount) setOnlineCount(stats.onlineCount);
  }, [stats, setOnlineCount]);

  /* Read timers */
  useEffect(() => {
    const timers = readTimersRef.current;
    unreadMessageIds.forEach((id) => {
      if (!timers.has(id)) {
        const t = setTimeout(() => { markAsRead(id); timers.delete(id); }, 3000);
        timers.set(id, t);
      }
    });
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, [unreadMessageIds, markAsRead]);

  /* Load more history */
  const loadMoreMessages = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    const state = useChatStore.getState();
    const realMessages = state.messages.filter((m) => !state.pendingIds.has(m.id));
    if (!realMessages.length) return;

    loadingRef.current = true;
    setIsLoadingMore(true);
    const scrollEl = scrollRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
    const prevScrollTop = scrollEl?.scrollTop ?? 0;

    try {
      const oldest = realMessages[0].timestamp;
      const ts = new Date(oldest as unknown as string).toISOString();
      const res = await fetch(apiUrl(`/messages?limit=50&before=${encodeURIComponent(ts)}`));
      const data: { messages: Message[]; hasMore: boolean } = await res.json();
      if (data.messages?.length) {
        useChatStore.getState().prependMessages([...data.messages].reverse());
        setHasMore(data.hasMore ?? false);
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight + prevScrollTop;
        });
      } else {
        setHasMore(false);
      }
    } catch { /* ignore */ } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [hasMore]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const dist = scrollHeight - scrollTop - clientHeight;
    isScrolledNearBottom.current = dist < 80;
    setShowScrollButton(dist > 200);
    if (scrollTop < 80 && !loadingRef.current) loadMoreMessages();
  };

  /* Merged chat items */
  const allItems = useMemo((): ChatItem[] => {
    const items: ChatItem[] = [
      ...messages.map((m) => ({ _type: "msg" as const, data: m })),
      ...systemMessages.map((s) => ({ _type: "sys" as const, ...s })),
    ];
    return items.sort(
      (a, b) =>
        toTime(a._type === "msg" ? a.data.timestamp : a.timestamp) -
        toTime(b._type === "msg" ? b.data.timestamp : b.timestamp),
    );
  }, [messages, systemMessages]);

  const msgIndexMap = useMemo(
    () => new Map(messages.map((m, i) => [m.id, i])),
    [messages],
  );

  if (!currentUsername) return null;

  const matchCount = searchQuery.trim()
    ? messages.filter(
        (m) => !m.unsent && !m.voiceNote && m.message.toLowerCase().includes(searchQuery.toLowerCase()),
      ).length
    : 0;

  const deletedCount = messages.filter((m) => m.unsent).length;

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: BG }}>
      <ChatHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUsersPanel={() => setShowUsersPanel(true)}
        onOpenSettings={() => { setInitialSettingsSection(null); setSettingsOpen(true); }}
        onOpenAccount={() => setLocation('/account')}
      />

      {/* Search match banner */}
      {searchQuery.trim() && (
        <div
          className="px-4 py-1.5 text-[12px] text-center shrink-0"
          style={{ background: `${ACCENT}0a`, color: `${ACCENT}bb` }}
        >
          {matchCount === 0 ? "No messages found" : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
        </div>
      )}

      {/* Clear deleted messages banner */}
      {deletedCount > 0 && !searchQuery && (
        <div
          className="flex items-center justify-between px-4 py-1.5 shrink-0"
          style={{ background: "rgba(239,68,68,0.04)", borderBottom: "1px solid rgba(239,68,68,0.07)" }}
        >
          <span className="text-[12px] flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Trash2 className="w-3 h-3" />
            {deletedCount} deleted message{deletedCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={clearDeletedMessages}
            className="text-[12px] font-medium px-2.5 py-0.5 rounded-full transition-colors"
            style={{ color: "#EF4444", background: "rgba(239,68,68,0.08)" }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Loading skeleton */}
        {messagesLoading && <LoadingSkeleton />}

        {/* Empty state */}
        {!messagesLoading && messages.length === 0 && systemMessages.length === 0 && (
          <EmptyState />
        )}

        {/* Message list */}
        {(!messagesLoading || messages.length > 0) && (
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{ padding: "8px 10px 10px" }}
          onScroll={handleScroll}
          ref={scrollRef}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          <div className="max-w-2xl mx-auto flex flex-col">
            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-3">
                {isLoadingMore ? (
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
                ) : (
                  <button
                    onClick={loadMoreMessages}
                    className="text-[11px] px-3 py-1 rounded-full transition-colors"
                    style={{ color: `${ACCENT}80` }}
                  >
                    Load earlier messages
                  </button>
                )}
              </div>
            )}

            {/* Message rows */}
            {allItems.map((item, allIdx) => {
              const prevItem = allItems[allIdx - 1];
              const prevTs = !prevItem
                ? null
                : prevItem._type === "msg" ? prevItem.data.timestamp : prevItem.timestamp;
              const curTs = item._type === "msg" ? item.data.timestamp : item.timestamp;
              const showDate =
                !prevTs || !isSameDay(new Date(toTime(curTs)), new Date(toTime(prevTs)));

              if (item._type === "sys") {
                return (
                  <div key={item.id}>
                    {showDate && <DateSeparator date={new Date(toTime(item.timestamp))} />}
                    <SystemMessageRow content={item.content} />
                  </div>
                );
              }

              const msg = item.data;
              const msgIdx = msgIndexMap.get(msg.id) ?? 0;
              const prevMsg = messages[msgIdx - 1];
              const nextMsg = messages[msgIdx + 1];

              const isConsecutive =
                !!prevMsg &&
                !pendingIds.has(prevMsg.id) &&
                prevMsg.senderName === msg.senderName &&
                toTime(msg.timestamp) - toTime(prevMsg.timestamp) < 120_000;

              const isLastInGroup =
                !nextMsg ||
                nextMsg.senderName !== msg.senderName ||
                toTime(nextMsg.timestamp) - toTime(msg.timestamp) >= 120_000;

              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator date={new Date(toTime(msg.timestamp))} />}
                  <ChatMessage
                    message={msg}
                    isOwn={msg.senderName === currentUsername}
                    isConsecutive={isConsecutive}
                    isLastInGroup={isLastInGroup}
                    isUnread={unreadMessageIds.includes(msg.id)}
                    highlight={searchQuery}
                    reactions={reactions.get(msg.id) ?? []}
                    onReply={() => { setEditingMessage(null); setReplyingTo(msg); }}
                    onEdit={() => { setReplyingTo(null); setEditingMessage(msg); }}
                    onDeleteForMe={() => deleteMessage(msg.id)}
                    onReact={(emoji) =>
                      socketService.getSocket()?.emit("react_message", { messageId: msg.id, emoji })
                    }
                  />
                </div>
              );
            })}

            <div ref={bottomRef} className="h-1" />
          </div>
        </div>
        )}

        {/* Online users panel */}
        <OnlineUsersPanel
          open={showUsersPanel}
          users={onlineUsers}
          currentUsername={currentUsername}
          currentAvatarColor={avatarColor}
          onClose={() => setShowUsersPanel(false)}
        />

        {/* Scroll-to-bottom FAB */}
        <AnimatePresence>
          {showScrollButton && !showUsersPanel && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.14 }}
              className="absolute bottom-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: ACCENT, boxShadow: `0 4px 16px ${ACCENT}50` }}
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <ChatInput
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setInitialSettingsSection(null); }}
        initialSection={initialSettingsSection}
      />
    </div>
  );
}
