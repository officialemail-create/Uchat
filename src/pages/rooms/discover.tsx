import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Search, Users, Hash, Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import { useDiscoverRooms, useJoinRoom, getGetRoomsQueryKey, type Room } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

export default function DiscoverRooms() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useDiscoverRooms({ search: debouncedSearch });
  const joinRoom = useJoinRoom();

  const handleJoin = (roomId: string, isMember: boolean) => {
    if (isMember) {
      setLocation(`/rooms/${roomId}`);
      return;
    }

    joinRoom.mutate(
      { roomId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
          setLocation(`/rooms/${roomId}`);
        }
      }
    );
  };

  const rooms = data?.rooms ?? [];

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 custom-scrollbar">
        <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-20 mb-6 rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Discover Rooms</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Find lively communities and jump in.</p>
                  </div>
                </div>
              </div>

              <label className="relative block w-full lg:max-w-md" aria-label="Search rooms">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for rooms..."
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 transition focus:outline-none focus:ring-2 focus:ring-purple-600 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                />
              </label>
            </div>
          </header>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 p-10 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm font-medium">Loading rooms...</p>
              </div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/80 px-6 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <MessageSquarePlus className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">No rooms found yet</h2>
              <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Try a different search term or create your own room to start a new community.
              </p>
              <button
                type="button"
                aria-label="Create room"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
              >
                Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room: Room) => (
                <article
                  key={room.id}
                  className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-purple-500/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        <Hash className="h-4 w-4" />
                      </div>
                      <h3 className="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{room.name}</h3>
                    </div>
                  </div>

                  <p className="mb-4 flex-1 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                    {room.description || "No description provided."}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>{room.memberCount} members</span>
                    </div>
                    {room.privacy === "private" ? (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Private
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Public</span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={room.isMember ? `Open ${room.name}` : `Join ${room.name}`}
                    onClick={() => handleJoin(room.id, room.isMember)}
                    disabled={joinRoom.isPending}
                    className="mt-4 w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-950"
                  >
                    {room.isMember ? "Open" : "Join"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
