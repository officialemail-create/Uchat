import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import CreateRoomModal from "@/components/layout/create-room-modal";
import { Compass, MessageSquareMore, PlusCircle, Sparkles, ShieldCheck, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { themeMode } = useSettingsStore();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const isDark = themeMode === "dark";
  const themeStyles = useMemo(() => ({
    page: isDark ? "#0B0F19" : "#F7F7FB",
    panel: isDark ? "#111827" : "#FFFFFF",
    panelSoft: isDark ? "#0B0F19" : "#F3F4F6",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
    text: isDark ? "#FFFFFF" : "#111827",
    textMuted: isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.64)",
    textSoft: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.72)",
  }), [isDark]);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto" style={{ background: themeStyles.page }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3">
              
            
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section
              className="rounded-3xl border p-5 shadow-[0_16px_45px_rgba(15,23,42,0.12)] sm:p-6"
              style={{ background: themeStyles.panel, borderColor: themeStyles.border }}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#8B5CF6]/15 p-2 text-[#8B5CF6]">
                  <Users className="h-5 w-5" />
                </div>
                <div> 
                  <h2 className="text-lg font-semibold" style={{ color: themeStyles.text }}>Global Chats. (coming soon)</h2>
                  <p className="text-sm" style={{ color: themeStyles.textMuted }}>Create a room or join.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  disabled
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold opacity-50"
                  style={{ borderColor: themeStyles.border, background: themeStyles.panelSoft, color: themeStyles.textSoft }}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Global Room
                </button>
                <button
                  disabled
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold opacity-50"
                  style={{ borderColor: themeStyles.border, background: themeStyles.panelSoft, color: themeStyles.textSoft }}
                >
                  <Compass className="h-4 w-4" />
                  Discover & Join Rooms
                </button>
                <button
                  disabled
                  className="flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold opacity-50"
                  style={{ borderColor: themeStyles.border, background: themeStyles.panelSoft, color: themeStyles.textSoft }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Join with room code
                </button>
              </div>
            </section>

            <section
              className="rounded-3xl border p-5 shadow-[0_16px_45px_rgba(15,23,42,0.12)] sm:p-6"
              style={{ background: themeStyles.panel, borderColor: themeStyles.border }}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#8B5CF6]/15 p-2 text-[#8B5CF6]">
                  <MessageSquareMore className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: themeStyles.text }}>Private Chats</h2>
                  <p className="text-sm" style={{ color: themeStyles.textMuted }}>One-to-One Chat.</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => setLocation("/messages")}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/12 px-4 py-3 text-sm font-semibold text-[#8B5CF6] transition-colors duration-150 hover:bg-[#8B5CF6]/20"
                >
                  <MessageSquareMore className="h-4 w-4" />
                  Open private chat inbox
                </button>
                
              </div>
            </section>
          </div>
        </div>
      </div>

      <CreateRoomModal open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} />
    </AppLayout>
  );
}
