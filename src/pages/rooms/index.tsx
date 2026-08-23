import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Hash } from "lucide-react";

export default function RoomsIndex() {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-[#8B5CF6]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to Uchat Rooms</h2>
        <p className="text-sm text-white/50 max-w-md">
          Select a room from the sidebar to start chatting, or discover new communities to join.
        </p>
      </div>
    </AppLayout>
  );
}
