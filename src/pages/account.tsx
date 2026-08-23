import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import SettingsModal from "@/components/settings-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/store/authStore";
import { resolveAvatarUrl } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const avatarUrl = resolveAvatarUrl(user?.profilePicture ?? null);

  return (
    <AppLayout hideBottomNav>
      <div className="flex min-h-full flex-col bg-background text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl bg-purple-600 text-white">
                <UserAvatar src={avatarUrl} alt={user?.displayName ?? "Profile"} size="xl" className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-purple-400">Account</p>
                <h1 className="text-2xl font-semibold">{user?.displayName ?? "Your profile"}</h1>
                <p className="text-sm text-white/60">@{user?.username ?? "unknown"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Account settings</p>
                <p className="text-sm text-white/60">Manage your profile, preferences, and app settings.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                Open settings
              </button>
            </div>
          </section>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppLayout>
  );
}
