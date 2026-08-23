import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetPrivateChats, sendFriendRequest, type Chat, type SearchUser } from "@workspace/api-client-react";
import { SkeletonRows } from "@/components/skeletons";
import { useDebounce } from "@/hooks/use-debounce";
import { apiUrl } from "@/lib/api-url";

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

function normalizeSearchUser(raw: any): SearchUser {
  const nested = raw?.user ?? raw?.data ?? raw ?? {};
  const username = typeof nested.username === 'string'
    ? nested.username
    : typeof raw?.username === 'string'
      ? raw.username
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
      : username ? `unknown-${username}` : `unknown-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    username: username || 'unknown',
    displayName,
    relationship: typeof nested.relationship === 'string' ? nested.relationship : 'none',
    online: Boolean(nested.online),
    profilePicture: nested.profilePicture ?? nested.profile_picture ?? null,
  };
}

export default function UserSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [showRecentUsers, setShowRecentUsers] = useState(true);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const trimmedQuery = debouncedQuery.trim();
  const { data: privateChatsData } = useGetPrivateChats();
  const recentUsers = privateChatsData?.chats?.slice(0, 5) ?? [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('uchat_recent_users_hidden');
    setShowRecentUsers(stored !== 'true');
  }, []);

  const sendRequestMutation = useMutation({
    mutationFn: (target: { targetUserId: string; targetUsername?: string }) => sendFriendRequest(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
      onClose();
    },
  });

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;

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

        const response = await fetch(apiUrl(`/users/search?q=${encodeURIComponent(trimmed)}`), {
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
          setResults(normalizedResults.map(normalizeSearchUser));
        }
      } catch (error) {
        if (!isCancelled) {
          setResults([]);
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

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSendRequest = (user: { id: string; username?: string }) => {
    sendRequestMutation.mutate({ targetUserId: user.id }, {
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to send friend request';
        if (!message.toLowerCase().includes('user not found')) {
          window.alert(message);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#1A1F2E] border-white/10 text-white p-0 overflow-hidden gap-0">
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#0B0F19]">
          <Search className="w-5 h-5 text-white/40 mr-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/40"
            autoFocus
            data-testid="input-user-search"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {trimmedQuery.length === 0 && recentUsers.length > 0 && showRecentUsers && (
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-sm font-semibold text-white">Recent users</p>
                  <p className="text-xs text-white/40">Quick access</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecentUsers(false);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('uchat_recent_users_hidden', 'true');
                    }
                  }}
                  aria-label="Clear recent history"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {recentUsers.map((chat: Chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSendRequest({ id: chat.otherUser.id, username: chat.otherUser.username })}
                    className="flex items-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold text-white">
                      {chat.otherUser.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{chat.otherUser.displayName}</p>
                      <p className="truncate text-xs text-white/40">@{chat.otherUser.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSearching && trimmedQuery.length > 0 && <SkeletonRows count={3} searching />}

          {trimmedQuery.length > 0 && !isSearching && searchError && (
            <div className="p-4 text-center text-sm text-rose-300">
              {String(searchError)}
            </div>
          )}

          {trimmedQuery.length > 0 && !isSearching && !searchError && results.length === 0 && (
            <div className="p-4 text-center text-sm text-white/40">
              No matching users yet. Keep typing to see suggestions.
            </div>
          )}

          {trimmedQuery.length > 0 && !isSearching && results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map((user: SearchUser, index: number) => {
                const usernameText = typeof user.username === 'string' && user.username.length > 0 ? user.username : 'Unknown User';
                const displayNameText = typeof user.displayName === 'string' && user.displayName.length > 0 ? user.displayName : usernameText;
                const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : `${usernameText}-${index}`;
                const isPending = user.relationship === 'pending';
                const isFriend = user.relationship === 'friend';
                const isSelf = user.relationship === 'self';
                const actionLabel = isFriend ? 'Friends' : isPending ? 'Requested' : isSelf ? 'You' : 'Add Friend';

                return (
                  <button
                    key={userId}
                    onClick={() => handleSendRequest({ id: userId, username: usernameText })}
                    disabled={isPending || isFriend || isSelf || sendRequestMutation.isPending}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors text-left"
                    data-testid={`button-send-request-${userId}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center shrink-0 text-white font-bold text-sm">
                      {displayNameText?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-white truncate">{highlightMatch(displayNameText, trimmedQuery)}</span>
                      <span className="text-xs text-white/40 truncate">@{highlightMatch(usernameText, trimmedQuery)}</span>
                    </div>
                    <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-white/80">
                      {actionLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
