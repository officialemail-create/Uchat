import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { JoinPrivateRoom } from "@/components/join-private-room";
import { useJoinRoomByCode, getGetRoomsQueryKey, type Room } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function JoinByCode() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  
  const joinByCode = useJoinRoomByCode();

  const handleJoin = async (nextCode: string) => {
    setError("");

    joinByCode.mutate(
      { data: { roomCode: nextCode } },
      {
        onSuccess: (room: Room) => {
          queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
          setLocation(`/rooms/${room.id}`);
        },
        onError: (err: any) => {
          setError(err.message || "Invalid or expired room code");
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-1 items-center justify-center bg-[#0B0F19] p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/5 bg-[#1A1F2E] p-8 shadow-2xl">
          <JoinPrivateRoom onSubmit={handleJoin} isSubmitting={joinByCode.isPending} error={error} />
        </div>
      </div>
    </AppLayout>
  );
}
