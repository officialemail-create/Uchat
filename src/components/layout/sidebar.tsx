import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Hash, MessageSquare, Inbox, Search, Plus, Compass, Settings, 
  Menu, X, Lock
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { socketService } from "@/services/socket";
import { useRoomStore } from "@/store/roomStore";
import { useDmStore } from "@/store/dmStore";
import { useGetRooms, useGetPrivateChats, getGetPrivateChatsQueryKey, getFriendRequests, acceptFriendRequest, declineFriendRequest, type Room, type Chat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SettingsModal from "@/components/settings-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { resolveAvatarUrl } from "@/lib/auth";
import CreateRoomModal from "./create-room-modal";
import UserSearchModal from "./user-search-modal";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'messages' | 'requests'>('messages');
  const { data: roomsData } = useGetRooms();
  const { data: dmsData } = useGetPrivateChats();
  const { data: pendingRequestsData } = useQuery({
    queryKey: ['friend-requests', 'pending'],
    queryFn: () => getFriendRequests('pending'),
  });
  const queryClient = useQueryClient();
  
  const roomStore = useRoomStore();
  const dmStore = useDmStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [searchUserOpen, setSearchUserOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
  const [isDecliningRequest, setIsDecliningRequest] = useState(false);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const socket = socketService.connect();
    const onUserProfileUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
    };

    socket.on("user_profile_updated", onUserProfileUpdated);
    return () => {
      socket.off("user_profile_updated", onUserProfileUpdated);
    };
  }, [queryClient]);

  const incomingRequests = useMemo(
    () => pendingRequestsData?.requests?.filter((request) => request.receiverId === user?.id) ?? [],
    [pendingRequestsData?.requests, user?.id],
  );

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onMutate: () => {
      setIsAcceptingRequest(true);
    },
    onSettled: async () => {
      setIsAcceptingRequest(false);
      await queryClient.invalidateQueries({ queryKey: ['friend-requests', 'pending'] });
      await queryClient.invalidateQueries({ queryKey: ['privateChats'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (requestId: string) => declineFriendRequest(requestId),
    onMutate: () => {
      setIsDecliningRequest(true);
    },
    onSettled: async () => {
      setIsDecliningRequest(false);
      await queryClient.invalidateQueries({ queryKey: ['friend-requests', 'pending'] });
    },
  });

  const RequestList = () => (
    <div className="space-y-3">
      <div className="px-2 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Friend Requests</h2>
      </div>
      {incomingRequests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted text-center">
          No pending requests
        </div>
      ) : (
        incomingRequests.map((request) => {
          const sender = request.sender;
          return (
            <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar src={resolveAvatarUrl(sender?.profilePicture ?? null)} alt={sender?.displayName ?? sender?.username ?? 'Friend request sender'} size="md" className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{sender?.displayName ?? sender?.username ?? 'Unknown'}</p>
                  <p className="truncate text-xs text-muted">@{sender?.username ?? 'unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => acceptMutation.mutate(request.id)}
                  disabled={isAcceptingRequest}
                  className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => declineMutation.mutate(request.id)}
                  disabled={isDecliningRequest}
                  className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden w-64 border-r border-border bg-background">
      <div className="flex items-center justify-between p-4 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-primary">Uchat</h1>
        <button 
          className="md:hidden p-1 text-muted/80 hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 flex flex-col gap-6">
        
        {/* Global Chats */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Global Chats</span>
            <button 
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-surface"
              onClick={() => setCreateRoomOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 text-muted" />
            </button>
          </div>
          
          <div className="flex flex-col gap-0.5">
            <Link href="/rooms/discover" className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors text-sm font-medium",
              location === "/rooms/discover" ? "text-foreground bg-surface border border-border shadow-sm" : "text-muted hover:text-foreground hover:bg-surface"
            )}>
              <Compass className={cn("w-4 h-4", location === "/rooms/discover" ? "text-primary" : "text-muted")} />
              Discover
            </Link>
            
            <Link href="/rooms/join" className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors text-sm font-medium",
              location === "/rooms/join" ? "text-foreground bg-surface border border-border shadow-sm" : "text-muted hover:text-foreground hover:bg-surface"
            )}>
              <Lock className={cn("w-4 h-4", location === "/rooms/join" ? "text-primary" : "text-muted")} />
              Join via Code
            </Link>

            {roomsData?.rooms.map((room: Room) => {
              const isActive = location === `/rooms/${room.id}`;
              const unread = roomStore.unreadCounts[room.id] || 0;
              
              return (
                <Link key={room.id} href={`/rooms/${room.id}`} className={cn(
                  "flex items-center justify-between px-2 py-2 rounded-xl transition-colors text-sm font-medium group",
                  isActive ? "text-foreground bg-surface border border-border shadow-sm" : "text-muted hover:text-foreground hover:bg-surface"
                )}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Hash className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted")} />
                    <span className="truncate text-foreground">{room.name}</span>
                  </div>
                  {unread > 0 && (
                    <span className="bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Private Chats */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 group">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Direct Messages</span>
            <button 
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-surface"
              onClick={() => setSearchUserOpen(true)}
            >
              <Search className="w-3.5 h-3.5 text-muted" />
            </button>
          </div>

          <div className="mb-3 rounded-2xl border border-border bg-surface/70 p-2">
            <div className="flex items-center gap-2 rounded-2xl bg-background/90 p-1">
              <button
                type="button"
                onClick={() => setViewMode('messages')}
                className={cn(
                  'flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-gray-800',
                  viewMode === 'messages' ? 'bg-gray-900/10 text-purple-500' : 'text-foreground',
                )}
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() => setViewMode('requests')}
                className={cn(
                  'flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition hover:bg-gray-800',
                  viewMode === 'requests' ? 'bg-gray-900/10 text-purple-500' : 'text-foreground',
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Inbox className="w-4 h-4" />
                  <span>Requests</span>
                  {incomingRequests.length > 0 ? (
                    <span className="rounded-full bg-[#8B5CF6] px-2 py-0.5 text-[10px] font-bold text-white">{incomingRequests.length}</span>
                  ) : null}
                </div>
              </button>
            </div>
          </div>

          {viewMode === 'messages' ? (
            <div className="flex flex-col gap-0.5">
              {dmsData?.chats?.map((chat: Chat) => {
                const isActive = location === `/messages/${chat.id}`;
                const unread = chat.unreadCount || dmStore.unreadCounts[chat.id] || 0;
                return (
                  <Link key={chat.id} href={`/messages/${chat.id}`} className={cn(
                    "flex items-center justify-between px-2 py-2 rounded-xl transition-colors text-sm font-medium",
                    isActive ? "text-foreground bg-surface border border-border shadow-sm" : "text-muted hover:text-foreground hover:bg-surface"
                  )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center shrink-0 text-[10px] font-bold text-muted">
                        {chat.otherUser.displayName[0].toUpperCase()}
                      </div>
                      <span className="truncate">{chat.otherUser.displayName}</span>
                    </div>
                    {unread > 0 && (
                      <span className="bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <RequestList />
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center justify-between px-2 py-2 rounded-xl border border-border bg-background/80 transition-colors hover:bg-surface cursor-pointer group" onClick={() => setSettingsOpen(true)}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-xs">
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.displayName}</span>
              <span className="text-xs text-muted truncate">@{user?.username}</span>
            </div>
          </div>
          <Settings className="w-4 h-4 text-muted group-hover:text-foreground" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 flex items-center px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1 text-muted/70 hover:text-foreground">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-3 font-semibold text-primary">Uchat</span>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-[100dvh] shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 300, stiffness: 30 }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50 shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CreateRoomModal open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} />
      <UserSearchModal open={searchUserOpen} onClose={() => setSearchUserOpen(false)} />
    </>
  );
}
