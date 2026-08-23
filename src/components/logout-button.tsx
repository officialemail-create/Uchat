import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { socketService } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { useChatStore } from "@/store/chatStore";
import { useDmStore } from "@/store/dmStore";
import { useRoomStore } from "@/store/roomStore";
import { useSettingsStore } from "@/store/settingsStore";

function hasDraftMessage() {
  return Array.from(document.querySelectorAll("textarea, input[type='text']"))
    .some((element) => (element as HTMLInputElement | HTMLTextAreaElement).value.trim().length > 0);
}

function clearCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();

  const handleLogout = () => {
    if (hasDraftMessage() && !window.confirm("You have an unsent message. Are you sure you want to log out?")) return;

    void supabase?.auth.signOut().catch(() => undefined);
    useAuthStore.getState().reset();
    useChatStore.getState().reset();
    useDmStore.getState().reset();
    useRoomStore.getState().reset();
    useSettingsStore.getState().reset();
    queryClient.clear();
    socketService.disconnect();
    localStorage.clear();
    sessionStorage.clear();
    clearCookies();
    window.location.href = "/login";
  };

  return (
    <button type="button" onClick={handleLogout} aria-label="Log out" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10 ${className}`}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>Log out</span>
    </button>
  );
}