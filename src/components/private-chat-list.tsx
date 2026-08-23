import { Inbox, MessageCircle, Search } from "lucide-react";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import {
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  getFriendRequests,
  sendFriendRequest,
  type SearchUser,
  getGetPrivateChatsQueryKey,
} from "@workspace/api-client-react";
import { socketService } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { SkeletonRows } from "@/components/skeletons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { resolveAvatarUrl } from "@/lib/auth";

function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} className="bg-yellow-300/30 text-white font-semibold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

type ChatListItem = {
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

export type UserSearchResult = {
  id: string;
  displayName: string;
  username: string;
  online: boolean;
  profilePicture?: string | null;
  relationship?: "none" | "pending" | "friend" | "self";
};

function normalizeSearchUser(raw: any): UserSearchResult {
  const nested = raw?.user ?? raw?.data ?? raw ?? {};
  const username = typeof nested.username === 'string'
    ? nested.username
    : typeof nested.user?.username === 'string'
      ? nested.user.username
      : typeof nested.data?.username === 'string'
        ? nested.data.username
        : '';
  const displayName = typeof nested.displayName === 'string'
    ? nested.displayName
    : typeof nested.display_name === 'string'
      ? nested.display_name
      : username || 'Unknown User';
  const id = typeof nested.id === 'string'
    ? nested.id
    : typeof raw?.id === 'string'
      ? raw.id
      : username || `unknown-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    username: username || 'unknown',
    displayName,
    online: Boolean(nested.online),
    profilePicture: nested.profilePicture ?? nested.profile_picture ?? null,
    relationship: typeof nested.relationship === 'string' ? nested.relationship : 'none',
  };
}

interface PrivateChatListProps {
  conversations: ChatListItem[];
  conversationsLoading?: boolean;
  onSelectConversation: (conversationId: string) => void;
  onStartChat: (user: UserSearchResult) => void;
  onAcceptedRequest?: (user: UserSearchResult) => void;
}

const ChatListItemRow = memo(function ChatListItemRow({ conversation, onSelectConversation }: { conversation: ChatListItem; onSelectConversation: (conversationId: string) => void }) {
  const avatarUrl = resolveAvatarUrl(conversation.profilePicture ?? null);
  return (
    <button
      type="button"
      onClick={() => onSelectConversation(conversation.id)}
      className={`flex items-center gap-4 p-4 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-900/50 ${conversation.isSelected ? "bg-purple-50 dark:bg-purple-900/20" : ""} ${conversation.isSelected ? "border-l-4 border-purple-600" : "border-l-4 border-transparent"}`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-transparent transition-all hover:border-purple-500">
        <UserAvatar src={avatarUrl} alt={conversation.displayName} size="lg" className="h-full w-full" />
        {conversation.showOnlineStatus !== false && conversation.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">{conversation.displayName}</p>
            <p className="ml-1 truncate text-xs font-mono text-gray-500 dark:text-gray-400">@{conversation.username}</p>
          </div>
          {conversation.showOnlineStatus !== false ? <span className="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500">{conversation.online ? 'Online' : 'Offline'}</span> : null}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="line-clamp-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{conversation.lastMessage}</p>
          {conversation.unreadCount > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{conversation.unreadCount}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
});

function UniversalSearch({ users, isLoading, error, query, onAddFriend, onStartChat, pendingFriendUserId, onClearSearch, pendingSentByMe, onCancelFriend }: {
  users: UserSearchResult[];
  isLoading: boolean;
  error: string | null;
  query: string;
  onAddFriend: (user: UserSearchResult) => void;
  onStartChat: (user: UserSearchResult) => void;
  pendingFriendUserId: string | null;
  onClearSearch: () => void;
  pendingSentByMe?: Set<string>;
  onCancelFriend?: (userId: string) => void;
}): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Search Results</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Find friends by username and send a request.</p>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-500" />
              Searching…
            </div>
          ) : null}
        </div>

        {query.trim().length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">Start typing to search for friends.</div>
        ) : isLoading ? (
          <div className="overflow-hidden rounded-3xl bg-[#121212] transition-opacity duration-300"><SkeletonRows count={4} searching /></div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-200">{String(error)}</div>
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">No users found.</div>
        ) : (
          <div className="space-y-2">
            {users.map((user, index) => {
              const isPending = user.relationship === 'pending' || pendingFriendUserId === user.id;
              const isFriend = user.relationship === 'friend';
              const isSelf = user.relationship === 'self';
              const usernameText = typeof user.username === 'string' && user.username.length > 0 ? user.username : 'Unknown User';
              const displayNameText = typeof user.displayName === 'string' && user.displayName.length > 0 ? user.displayName : usernameText;
              const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : `${usernameText}-${index}`;
              const buttonLabel = isFriend ? 'Friends' : isPending ? 'Requested' : isSelf ? 'You' : 'Add';
              const canAdd = !isFriend && !isPending && !isSelf && Boolean(userId) && usernameText !== 'Unknown User';

              return (
                <div
                  key={userId}
                  role={isFriend ? "button" : undefined}
                  tabIndex={isFriend ? 0 : undefined}
                  onClick={() => isFriend && onStartChat({ ...user, id: userId, username: usernameText, displayName: displayNameText, online: user.online ?? false })}
                  onKeyDown={(event) => {
                    if (isFriend && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onStartChat({ ...user, id: userId, username: usernameText, displayName: displayNameText, online: user.online ?? false });
                    }
                  }}
                  className={`flex items-center justify-between gap-3 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${isFriend ? "cursor-pointer transition hover:border-purple-300 hover:bg-purple-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:hover:border-purple-700 dark:hover:bg-purple-950/20" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar src={resolveAvatarUrl(user.profilePicture ?? null)} alt={displayNameText} size="lg" className="h-12 w-12" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{displayNameText}</p>
                      <p className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">@{highlightMatch(usernameText, query)}</p>
                    </div>
                  </div>
                  {/* Render action: Add, Requested, or Cancel if sent by current user */}
                  {isPending ? (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">Requested</span>
                      {pendingSentByMe && pendingSentByMe.has(userId) && onCancelFriend ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onCancelFriend(userId); }} className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-700 hover:bg-gray-200">Cancel</button>
                      ) : null}
                    </div>
                  ) : (
                    <button type="button" disabled={!canAdd} onClick={(e) => { e.stopPropagation(); canAdd && onAddFriend({ ...user, id: userId, username: usernameText, displayName: displayNameText, online: user.online ?? false }); }} className={`rounded-2xl ${canAdd ? 'bg-purple-600 px-3 py-2 text-xs font-semibold uppercase text-white transition hover:bg-purple-700' : 'bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{buttonLabel}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestList({ requests, onAcceptRequest, onDeclineRequest }: {
  requests: Array<{ id: string; sender?: SearchUser | null; receiver?: SearchUser | null; senderId?: string; receiverId?: string; status?: string }>;
  onAcceptRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
}) {
  if (!requests || requests.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Requests</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review incoming friend requests before accepting.</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {requests.map((request) => {
          const peer = request.sender?.id ? request.sender : request.receiver;
          return (
            <div key={request.id} className="flex items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-purple-300 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <UserAvatar src={resolveAvatarUrl(peer?.profilePicture ?? null)} alt={peer?.displayName ?? "Friend request user"} size="lg" className="h-12 w-12" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{peer?.displayName ?? "New request"}</p>
                  <p className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">@{peer?.username ?? "request"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onAcceptRequest(request.id)} className="rounded-2xl bg-purple-600 px-3 py-2 text-sm font-semibold uppercase text-white transition hover:bg-purple-700">Confirm</button>
                <button type="button" onClick={() => onDeclineRequest(request.id)} className="rounded-2xl bg-gray-100 px-3 py-2 text-sm font-semibold uppercase text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PrivateChatList({ conversations, conversationsLoading = false, onSelectConversation, onStartChat, onAcceptedRequest }: PrivateChatListProps) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<'messages' | 'requests'>('messages');
  const debouncedQuery = useDebounce(query, 300);
  const { toast } = useToast();
  const lastNotFoundQuery = useRef("");
  const [localRelationshipState, setLocalRelationshipState] = useState<Record<string, UserSearchResult['relationship']>>({});
  const [pendingFriendUserId, setPendingFriendUserId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const currentQuery = trimmed;

    const fetchUsers = async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const token = typeof window !== 'undefined'
          ? await (await import('@/lib/supabase')).getSupabaseAuthToken()
          : null;
        const username = typeof window !== 'undefined' ? localStorage.getItem('uchat_username') : null;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(username ? { 'x-username': username } : {}),
        };

        const response = await fetch(`/api/users/search?q=${encodeURIComponent(currentQuery)}`, {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        const text = await response.text();
        const json = text ? JSON.parse(text) : {};
        const normalizedResults = Array.isArray(json.users)
          ? json.users
          : Array.isArray(json)
            ? json
            : Array.isArray(json?.data?.users)
              ? json.data.users
              : [];

        console.log('Search Results:', normalizedResults);

        const errorPayload = json?.error;
        const errorMessage = typeof errorPayload === 'string'
          ? errorPayload
          : errorPayload && typeof errorPayload.message === 'string'
            ? errorPayload.message
            : errorPayload && typeof errorPayload.code === 'string'
              ? `${errorPayload.code}: ${errorPayload.message ?? 'Search failed'}`
              : `Search failed (${response.status})`;

        if (!response.ok) {
          throw new Error(errorMessage);
        }

        if (!isCancelled) {
          setSearchResults(normalizedResults.map(normalizeSearchUser));
        }
      } catch (error) {
        if (!isCancelled) {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : 'Unable to search users. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    fetchUsers();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const { data: pendingRequestsData } = useQuery({
    queryKey: ["friend-requests", "pending"],
    queryFn: () => getFriendRequests("pending"),
  });

  const { user } = useAuthStore();
  const [pendingRequests, setPendingRequests] = useState<Array<any>>([]);

  useEffect(() => {
    setPendingRequests(pendingRequestsData?.requests ?? []);
  }, [pendingRequestsData]);

  const pendingSentByMe = useMemo(() => new Set(
    (pendingRequests ?? [])
      .filter((r) => r.status === 'pending' && r.senderId === user?.id)
      .map((r) => r.receiverId || r.receiver?.id)
  ), [pendingRequests, user?.id]);

  const filteredRequests = useMemo(() => {
    const text = debouncedQuery.trim().toLowerCase();
    if (!text) return pendingRequests.filter((r) => r.status === 'pending' && r.receiverId === user?.id);
    return pendingRequests.filter((request) => {
      if (request.status !== 'pending' || request.receiverId !== user?.id) return false;
      const peer = request.sender?.id ? request.sender : request.receiver;
      return [peer?.displayName, peer?.username].some((v) => v?.toLowerCase().includes(text));
    });
  }, [pendingRequests, debouncedQuery, user?.id]);

  const pendingRequestCount = useMemo(() => pendingRequests.filter((r) => r.status === 'pending' && r.receiverId === user?.id).length, [pendingRequests, user?.id]);

  const users = useMemo<UserSearchResult[]>(() => {
    return searchResults
      .filter((s) => s.id !== user?.id)
      .map((s) => ({ id: s.id, displayName: s.displayName, username: s.username, online: s.online ?? false, relationship: localRelationshipState[s.id] ?? s.relationship ?? 'none' }));
  }, [searchResults, localRelationshipState, user?.id]);

  useEffect(() => {
    const socket = socketService.connect();
    const onReceived = (payload: any) => {
      const req = payload?.request;
      if (!req) return;
      if (!user || req.receiverId !== user.id) return;
      setPendingRequests((prev) => [req, ...prev]);
      toast({ title: `New message request from ${req.sender?.displayName ?? 'Someone'}` });
    };
    const onUpdated = (payload: any) => {
      const request = payload?.request ?? payload;
      if (!request?.id) return;
      setPendingRequests((prev) => {
        if (request.status !== 'pending') return prev.filter((r) => r.id !== request.id);
        return prev.map((r) => (r.id === request.id ? { ...r, status: request.status } : r));
      });
      if (request.status === 'accepted' && user) {
        const otherUser = request.senderId === user.id ? request.receiver : request.sender;
        if (otherUser?.id) setLocalRelationshipState((prev) => ({ ...prev, [otherUser.id]: 'friend' }));
      }
    };

    socket.on('friend_request_received', onReceived);
    socket.on('friend_request_updated', onUpdated);
    return () => {
      socket.off('friend_request_received', onReceived);
      socket.off('friend_request_updated', onUpdated);
    };
  }, [user, toast]);

  const requestFriendMutation = useMutation({
    mutationFn: (target: { targetUserId: string; targetUsername?: string }) => sendFriendRequest({ targetUserId: target.targetUserId }),
    onMutate: (target) => {
      setPendingFriendUserId(target.targetUserId);
      setLocalRelationshipState((prev) => ({ ...prev, [target.targetUserId]: 'pending' }));
    },
    onSuccess: () => {
      toast({ title: 'Friend request sent', description: 'Your request is now pending review.' });
    },
    onError: (error, target) => {
      setLocalRelationshipState((prev) => {
        const next = { ...prev };
        if (target.targetUserId) delete next[target.targetUserId];
        return next;
      });
      const message = error instanceof Error ? error.message : 'Please try again shortly.';
      const normalized = message.toLowerCase();
      if (normalized.includes('request already sent')) {
        toast({ title: 'Friend request already sent', description: 'You already have a pending request for this user.' });
      } else if (normalized.includes('already friends')) {
        toast({ title: 'Already friends', description: 'You are already connected with this user.' });
      } else if (normalized.includes('self') || normalized.includes('yourself')) {
        toast({ title: 'Cannot add yourself', description: 'You cannot send a friend request to your own account.' });
      } else if (!normalized.includes('user not found')) {
        toast({ title: 'Unable to add friend', description: message });
      }
    },
    onSettled: () => setPendingFriendUserId(null),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async (_data, requestId) => {
      await queryClient.invalidateQueries({ queryKey: ["friend-requests", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      await queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
      setPendingRequests((prev) => {
        const request = prev.find((r) => r.id === requestId);
        const peer = request?.sender ? request.sender : request?.receiver;
        if (peer) {
          if (onAcceptedRequest) onAcceptedRequest({ id: peer.id, displayName: peer.displayName, username: peer.username, online: false });
          // navigate/open chat with the accepted user
          if (onStartChat) onStartChat({ id: peer.id, displayName: peer.displayName, username: peer.username, online: peer.online ?? false });
        }
        return prev.filter((r) => r.id !== requestId);
      });
      toast({ title: 'Friend request accepted', description: 'The chat is ready to open.' });
    },
    onError: (error) => toast({ title: 'Unable to accept request', description: error instanceof Error ? error.message : 'Please try again shortly.' }),
  });

  // Compact RequestsSection: header + badge and horizontal scrollable request cards
  function RequestsSection({
    requests,
    onAccept,
    onReject,
  }: {
    requests: Array<any>;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
  }) {
    useEffect(() => {
      const socket = socketService.connect();
      const onNew = (payload: any) => {
        console.log('Received new request:', payload);
        const req = payload?.request ?? payload;
        if (!req) return;
        setPendingRequests((prev) => [req, ...prev]);
        toast({ title: 'New friend request', description: `${req.sender?.displayName ?? req.sender?.username ?? 'Someone'} sent you a request.` });
      };

      // Backend emits 'friend_request_received' on new requests; listen for that event.
      socket.on('friend_request_received', onNew);
      return () => {
        socket.off('friend_request_received', onNew);
      };
    }, []);
    if (!requests || requests.length === 0) return null;

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Requests</p>
            <span className="inline-flex items-center justify-center rounded-full bg-purple-600 px-2 text-xs font-bold text-white">{requests.length}</span>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {requests.map((request) => {
            const peer = request.sender?.id ? request.sender : request.receiver;
            return (
              <div key={request.id} className="flex-shrink-0 w-48 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <UserAvatar src={resolveAvatarUrl(peer?.profilePicture ?? null)} alt={peer?.displayName ?? "Request user"} size="lg" className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{peer?.displayName}</p>
                    <p className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">@{peer?.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onAccept(request.id)} className="flex-1 rounded-2xl bg-purple-600 px-3 py-2 text-sm font-semibold uppercase text-white hover:bg-purple-700">Confirm</button>
                  <button onClick={() => onReject(request.id)} className="rounded-2xl bg-gray-100 px-3 py-2 text-sm font-semibold uppercase text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["friend-requests", "pending"] });
      setPendingRequests((prev) => prev.filter((r) => r.status === 'pending'));
      toast({ title: 'Request removed', description: 'The request has been declined.' });
    },
    onError: (error) => toast({ title: 'Unable to decline request', description: error instanceof Error ? error.message : 'Please try again shortly.' }),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["friend-requests", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["users", "search"] });
      setPendingRequests((prev) => prev.filter((r) => r.status === 'pending' && r.senderId !== user?.id));
      toast({ title: 'Request cancelled', description: 'Your friend request has been withdrawn.' });
    },
    onError: (error) => toast({ title: 'Unable to cancel request', description: error instanceof Error ? error.message : 'Please try again shortly.' }),
  });

  const handleCancelRequest = (targetUserId: string) => {
    const req = pendingRequests.find((r) => r.status === 'pending' && r.senderId === user?.id && (r.receiverId === targetUserId || r.receiver?.id === targetUserId));
    if (!req) return;
    cancelRequestMutation.mutate(req.id);
  };

  const handleAddFriend = (u: UserSearchResult) => {
    if (u.relationship === 'friend' || u.relationship === 'pending' || u.relationship === 'self') return;
    requestFriendMutation.mutate({ targetUserId: u.id });
  };

  const handleAcceptRequest = (requestId: string) => acceptRequestMutation.mutate(requestId);
  const handleDeclineRequest = (requestId: string) => declineRequestMutation.mutate(requestId);

  const filteredConversations = useMemo(() => {
    const text = debouncedQuery.trim().toLowerCase();
    if (!text) return conversations;
    return conversations.filter((c) => [c.displayName, c.username, c.lastMessage].some((v) => v.toLowerCase().includes(text)));
  }, [conversations, debouncedQuery]);

  return (
    <div className="flex h-full w-full max-w-3xl flex-col rounded-none bg-white/90 dark:bg-gray-900/90 lg:mx-auto lg:rounded-2xl lg:border lg:border-gray-200 lg:shadow-sm dark:lg:border-gray-800">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 p-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-600">Private chat</p>
            <h1 className="text-lg font-semibold leading-tight text-gray-900 dark:text-white">{viewMode === 'requests' ? 'Requests' : 'Messages'}</h1>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
          <Search className="h-4 w-4 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username" aria-label="Search conversations or users" className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white" />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
        <button type="button" onClick={() => setViewMode('messages')} className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${viewMode === 'messages' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          Messages
        </button>
        <button type="button" onClick={() => setViewMode('requests')} className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${viewMode === 'requests' ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-900' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span>Requests</span>
            {pendingRequestCount > 0 ? <span className="ml-auto inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-purple-600 px-2 text-xs font-bold text-white">{pendingRequestCount}</span> : null}
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {viewMode === 'requests' ? (
          <RequestsSection requests={filteredRequests} onAccept={handleAcceptRequest} onReject={handleDeclineRequest} />
        ) : debouncedQuery.trim().length > 0 ? (
          <UniversalSearch
            users={users}
            isLoading={isSearching}
            error={searchError}
            query={query}
            onAddFriend={handleAddFriend}
            onStartChat={(u) => onStartChat({ ...u, online: u.online ?? false })}
            pendingFriendUserId={pendingFriendUserId}
            onClearSearch={() => setQuery('')}
            pendingSentByMe={pendingSentByMe}
            onCancelFriend={handleCancelRequest}
          />
        ) : conversationsLoading ? (
          <div className="overflow-hidden bg-[#121212] transition-opacity duration-300"><SkeletonRows count={4} /></div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-4 rounded-3xl border border-purple-200 bg-purple-50/90 p-8 shadow-sm shadow-purple-100 dark:border-purple-900/40 dark:bg-purple-950/50">
             
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No conversations found</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Search using a username to start chat.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {filteredConversations.map((conversation) => (
                <ChatListItemRow key={conversation.id} conversation={conversation} onSelectConversation={onSelectConversation} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
