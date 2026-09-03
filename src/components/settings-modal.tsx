import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { apiUrl, storageUrl } from "@/lib/api-url";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  UserRound,
  Shield,
  Bell,
  Paintbrush,
  Database,
  CircleHelp,
  Check,
  Camera,
  Loader2,
  Lock,
  Mail,
  PencilLine,
  Eye,
  EyeOff,
  Clock3,
  ChevronRight,
  Download,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  UserCog,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Laptop,
  KeyRound,
  BellRing,
} from "lucide-react";
import { useSettingsStore, ACCENT_PRESETS, type FontSize } from "@/store/settingsStore";
import { useChatStore } from "@/store/chatStore";
import { useToast } from "@/hooks/use-toast";
import { disablePushNotifications, enablePushNotifications } from "@/lib/push-notifications";
import { useLocation } from "wouter";
import { authApi, getSessionToken, resolveAvatarUrl } from "@/lib/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/store/authStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: "account" | null;
}

const PROFILE_PIC_KEY = "uchat_profile_pic";

type ToggleKey = "showOnlineStatus" | "showLastSeen" | "readReceipts" | "blockUnknownUsers" | "muteAll" | "messageSounds" | "desktopNotifications" | "vibration" | "showLockPreview";

function SectionCard({ title, icon: Icon, active, children }: { title: string; icon: React.ElementType; active?: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white">
        <Icon className={`h-5 w-5 ${active ? "text-purple-600" : "text-gray-400"}`} />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description ? <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={ariaLabel}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${checked ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function FieldLabel({ label, required, htmlFor }: { label: string; required?: boolean; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
  );
}

function SectionButton({ children, className = "", onClick, variant = "default", disabled = false }: { children: React.ReactNode; className?: string; onClick?: () => void; variant?: "default" | "primary" | "ghost" | "danger"; disabled?: boolean }) {
  const variantClass =
    variant === "primary"
      ? "bg-purple-600 text-white hover:bg-purple-700"
      : variant === "danger"
        ? "border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        : variant === "ghost"
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`}>
      {children}
    </button>
  );
}

function SettingsAccountCard({ onClose, sectionRef }: { onClose: () => void; sectionRef?: RefObject<HTMLDivElement>; }) {
  const { currentUsername, avatarColor, setAvatarColor } = useChatStore();
  const { user, setUser } = useAuthStore();
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(() => {
    const stored = localStorage.getItem(PROFILE_PIC_KEY);
    return stored ?? resolveAvatarUrl(user?.profilePicture ?? null) ?? null;
  });
  const [displayName, setDisplayName] = useState(currentUsername ?? "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ displayName?: string; username?: string }>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const nextPic = resolveAvatarUrl(user?.profilePicture ?? null) ?? localStorage.getItem(PROFILE_PIC_KEY);
    setProfilePicUrl(nextPic);
  }, [user?.profilePicture]);

  const handleSave = async () => {
    const nextErrors: { displayName?: string; username?: string } = {};
    if (!displayName.trim()) nextErrors.displayName = "Display name is required.";
    if (!currentUsername?.trim()) nextErrors.username = "Username is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSaving(false);
    toast({ title: "Settings saved", description: "Your profile identity was updated." });
  };

  const handlePicUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const token = getSessionToken();
      const username = localStorage.getItem("uchat_username");
      const res = await fetch(apiUrl("/storage/uploads/request-url"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(username ? { "x-username": username } : {}),
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(username ? { "x-username": username } : {}),
        },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");
      const servingUrl = storageUrl(objectPath);
      
      // Update profile via API to sync across all users
      const profileRes = await authApi.updateProfile({ profilePicture: servingUrl });
      
      // Update local state and auth store with the response from server
      localStorage.setItem(PROFILE_PIC_KEY, servingUrl);
      setProfilePicUrl(servingUrl);
      setUser(profileRes);
    } catch (err) {
      let errorMessage = "Upload failed";
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("fetch")) {
          errorMessage = "Unable to connect. Please check your internet connection.";
        } else {
          errorMessage = err.message;
        }
      }
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [setUser]);

  return (
    <div ref={sectionRef} tabIndex={-1} className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Account & Profile" icon={UserRound} active>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-2xl font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" style={{ background: avatarColor }}>
              <UserAvatar src={profilePicUrl} alt="Profile" size="xl" className="h-full w-full" />
            </div>
          </div>
          <div className="flex-1"> 
            <p className="text-sm text-gray-500 dark:text-gray-400">Profile</p>
            <button type="button" className="mt-1 text-sm font-medium text-purple-600 hover:underline" onClick={() => document.getElementById("profile-upload")?.click()}>
              Change Photo
            </button>
            <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePicUpload(f); e.target.value = ""; }} />
            {uploadError ? <p className="mt-2 text-sm text-red-500">{uploadError}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <FieldLabel htmlFor="display-name" label="Display Name" required />
            <input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
            {errors.displayName ? <p className="mt-2 text-sm text-red-500">{errors.displayName}</p> : null}
          </div>
          <div>
            <FieldLabel htmlFor="username" label="Username" />
            <div className="flex gap-2">
              <input id="username" readOnly value={currentUsername ?? ""} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" />
              <button type="button" className="rounded-lg border border-purple-600 px-3 py-2 text-sm font-semibold text-purple-600">Edit</button>
            </div>
            {errors.username ? <p className="mt-2 text-sm text-red-500">{errors.username}</p> : null}
          </div>
          <div>
            <FieldLabel htmlFor="email" label="Email" />
            <div className="flex items-center gap-2">
              <input id="email" readOnly value="" className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" />
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Verify</span>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="bio" label="Bio / Status" />
            <textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Share your status or bio" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SectionButton onClick={handleSave} variant="primary" className="min-w-[140px]">
            {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : "Save Changes"}
          </SectionButton>
          <SectionButton variant="ghost" onClick={onClose}>Close</SectionButton>
        </div>
      </SectionCard>

      <SectionCard title="Avatar Palette" icon={Paintbrush} active={false}>
        <div className="grid grid-cols-4 gap-3">
          {ACCENT_PRESETS.slice(0, 8).map((preset) => (
            <button key={preset.hex} type="button" onClick={() => setAvatarColor(preset.hex)} className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-2 text-center transition hover:border-purple-300 dark:border-gray-800 dark:hover:border-purple-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: preset.hex }}>
                {avatarColor === preset.hex ? <Check className="h-4 w-4 text-white" /> : null}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{preset.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function PrivacySettings() {
  const { update } = useSettingsStore();
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const [privacy, setPrivacy] = useState({
    showOnlineStatus: user?.showOnlineStatus !== false,
    showLastSeen: !(user?.hideLastSeen ?? false),
    readReceipts: true,
    blockUnknownUsers: false,
  });
  const [twoFactorEnabled] = useState(true);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [isUpdatingLastSeen, setIsUpdatingLastSeen] = useState(false);

  useEffect(() => {
    setPrivacy((current) => ({
      ...current,
      showOnlineStatus: user?.showOnlineStatus !== false,
      showLastSeen: !(user?.hideLastSeen ?? false),
    }));
  }, [user?.hideLastSeen, user?.showOnlineStatus]);

  const applyPrivacy = async (key: keyof typeof privacy, value: boolean) => {
    setPrivacy((current) => ({ ...current, [key]: value }));
    if (key === "showOnlineStatus") {
      const previous = user?.showOnlineStatus !== false;
      setUser(user ? { ...user, showOnlineStatus: value } : user);
      try {
        const result = await authApi.updateUserSettings({ show_online_status: value });
        setUser(user ? { ...user, showOnlineStatus: result.showOnlineStatus } : user);
        toast({ title: "Privacy updated", description: value ? "Your status is visible" : "Your status is hidden" });
      } catch (error) {
        setPrivacy((current) => ({ ...current, showOnlineStatus: previous }));
        setUser(user ? { ...user, showOnlineStatus: previous } : user);
        toast({ title: "Unable to update privacy", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
      }
      return;
    }
    if (key === "showLastSeen") {
      const previous = Boolean(user?.hideLastSeen);
      const nextValue = value;

      if (isUpdatingLastSeen || previous === nextValue) return;

      setIsUpdatingLastSeen(true);
      setUser(user ? { ...user, hideLastSeen: nextValue } : user);

      try {
        const result = await authApi.updateUserSettings({ hide_last_seen: nextValue });
        setUser(user ? { ...user, hideLastSeen: result.hideLastSeen, lastSeen: result.lastSeen } : user);
        toast({
          title: "Privacy updated",
          description: nextValue ? "Your Last seen is now hidden" : "Your Last seen is now visible",
        });
      } catch (error) {
        setPrivacy((current) => ({ ...current, showLastSeen: !nextValue }));
        setUser(user ? { ...user, hideLastSeen: previous } : user);
        toast({
          title: "Unable to update privacy",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdatingLastSeen(false);
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Privacy & Security" icon={Shield} active>
        <div className="space-y-3">
          <ToggleControl label="Show Online Status" description="Let contacts see when you are active." checked={privacy.showOnlineStatus} onChange={(next) => applyPrivacy("showOnlineStatus", next)} ariaLabel="Toggle online status visibility" />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/40">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hide Last Seen</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Keep your recent activity private from other users.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Toggle hide last seen visibility"
              aria-checked={Boolean(user?.hideLastSeen)}
              disabled={isUpdatingLastSeen}
              onClick={() => applyPrivacy("showLastSeen", !Boolean(user?.hideLastSeen))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${Boolean(user?.hideLastSeen) ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${Boolean(user?.hideLastSeen) ? "translate-x-6" : "translate-x-1"}`} />
              {isUpdatingLastSeen ? <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" /> : null}
            </button>
          </div>
          <ToggleControl label="Read Receipts" description="Send double-tick read confirmations." checked={privacy.readReceipts} onChange={(next) => applyPrivacy("readReceipts", next)} ariaLabel="Toggle read receipts" />
          <ToggleControl label="Block Unknown Users" description="Automatically ignore unknown new contacts." checked={privacy.blockUnknownUsers} onChange={(next) => applyPrivacy("blockUnknownUsers", next)} ariaLabel="Toggle unknown users blocking" />
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Sessions</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chrome on Windows • Last active 3m ago</p>
            </div>
            <button type="button" onClick={() => setRevokeBusy(true)} className="text-sm font-semibold text-red-600 transition hover:text-red-700">{revokeBusy ? "Revoking..." : "Revoke"}</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Two-Factor Auth" icon={KeyRound} active={false}>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Security status</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Two-factor authentication is {twoFactorEnabled ? "enabled" : "disabled"}.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${twoFactorEnabled ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{twoFactorEnabled ? "Enabled" : "Disabled"}</span>
        </div>
        <div className="mt-4 flex gap-3">
          <SectionButton variant="primary">Manage</SectionButton>
          <SectionButton variant="ghost">Reset Backup Codes</SectionButton>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsNotificationsCard() {
  const { soundEnabled, desktopNotifications, update } = useSettingsStore();
  const [notifications, setNotifications] = useState({
    muteAll: false,
    messageSounds: soundEnabled,
    desktopNotifications,
    vibration: true,
    showLockPreview: false,
  });
  const [muteDuration, setMuteDuration] = useState("1h");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const apply = (key: keyof typeof notifications, value: boolean) => {
    setNotifications((current) => ({ ...current, [key]: value }));
    if (key === "messageSounds") update({ soundEnabled: value });
    if (key === "desktopNotifications") {
      update({ desktopNotifications: value });
      setPushBusy(true);
      void (value ? enablePushNotifications() : disablePushNotifications()).then((success) => {
        setPushStatus(success ? (value ? "Push notifications enabled" : "Push notifications disabled") : "Push notifications are unavailable in this browser or backend.");
        if (!success) toast({ title: "Notifications unavailable", description: "Check browser permission and backend push configuration.", variant: "destructive" });
      }).catch(() => {
        setPushStatus("Push notification setup failed");
        toast({ title: "Notifications unavailable", description: "Unable to register this device.", variant: "destructive" });
      }).finally(() => setPushBusy(false));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Notifications & Sound" icon={Bell} active>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/40">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Mute All Notifications</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pause incoming alerts for a selected duration.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={muteDuration} onChange={(e) => setMuteDuration(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <option>1h</option>
                <option>8h</option>
                <option>24h</option>
                <option>Always</option>
              </select>
              <ToggleControl label="" description="" checked={notifications.muteAll} onChange={(next) => apply("muteAll", next)} ariaLabel="Mute all notifications" />
            </div>
          </div>
          <ToggleControl label="Message Sounds" description="Play a tone on incoming messages." checked={notifications.messageSounds} onChange={(next) => apply("messageSounds", next)} ariaLabel="Toggle message sounds" />
          <ToggleControl label="Desktop Notifications" description={pushBusy ? "Updating this device..." : pushStatus ?? "Display alerts while you are away."} checked={notifications.desktopNotifications} onChange={(next) => apply("desktopNotifications", next)} ariaLabel="Toggle desktop notifications" />
          <ToggleControl label="Vibration" description="Use vibration feedback on mobile." checked={notifications.vibration} onChange={(next) => apply("vibration", next)} ariaLabel="Toggle vibration" />
          <ToggleControl label="Show Preview in Lock Screen" description="Show alert previews even when locked." checked={notifications.showLockPreview} onChange={(next) => apply("showLockPreview", next)} ariaLabel="Toggle preview in lock screen" />
        </div>
      </SectionCard>

      <SectionCard title="Delivery Profile" icon={BellRing} active={false}>
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiet Hours</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Custom schedules can be added later, but the system is now consistent and easy to scan.</p>
          </div>
          <div className="flex gap-3">
            <SectionButton variant="primary">Apply</SectionButton>
            <SectionButton variant="ghost">Review</SectionButton>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsAppearanceCard() {
  const { accentColor, fontSize, themeMode, update } = useSettingsStore();
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(themeMode);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Appearance" icon={Paintbrush} active>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { id: "light", label: "Light", icon: SunMini },
            { id: "dark", label: "Dark", icon: MoonMini },
          ].map((theme) => {
            const activeTheme = selectedTheme === theme.id;
            return (
              <button key={theme.id} type="button" onClick={() => { setSelectedTheme(theme.id as "light" | "dark"); update({ themeMode: theme.id as "light" | "dark" }); }} className={`rounded-lg border-2 p-4 text-left transition ${activeTheme ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 hover:border-purple-300 dark:border-gray-700"}`}>
                <theme.icon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{theme.label}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{theme.id === "dark" ? "Use dark surfaces" : "Use light surfaces"}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</p>
          <div className="flex gap-2">
            {(["small", "medium", "large"] as FontSize[]).map((size) => (
              <button key={size} type="button" onClick={() => update({ fontSize: size })} className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition ${fontSize === size ? "border-purple-600 bg-purple-600 text-white" : "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"}`}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <SectionButton variant="ghost">Choose Wallpaper</SectionButton>
        </div>
      </SectionCard>

      <SectionCard title="Accent & Theme" icon={UserCog} active={false}>
        <div className="grid grid-cols-4 gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button key={preset.hex} type="button" onClick={() => update({ accentColor: preset.hex })} className={`flex items-center justify-center rounded-full border-2 p-2 transition ${accentColor === preset.hex ? "border-purple-600" : "border-transparent"}`}>
              <span className="h-10 w-10 rounded-full" style={{ background: preset.hex }} />
            </button>
          ))}
        </div>
       
      </SectionCard>
    </div>
  );
}

function SettingsStorageCard() {
  const { update } = useSettingsStore();
  const [cacheCleared, setCacheCleared] = useState(false);
  const [deleteRange, setDeleteRange] = useState("30 days");

  const clearCache = () => {
    try {
      const preserve = ["uchat_username", "uchat_avatar_color", "uchat_settings", "uchat_data_saver"];
      Object.keys(localStorage).forEach((key) => {
        if (!preserve.includes(key)) localStorage.removeItem(key);
      });
    } catch {}
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Data & Storage" icon={Database} active>
        <div className="space-y-4">
          <div>
           
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-2.5 rounded-full bg-purple-600" style={{ width: "24%" }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <SectionButton variant="ghost" onClick={clearCache}>{cacheCleared ? "Cache Cleared" : "Clear Cache"}</SectionButton>
            <SectionButton variant="primary">Download Chat History</SectionButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Retention" icon={Trash2} active={false}>
        <div className="space-y-4">
          <select value={deleteRange} onChange={(e) => setDeleteRange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option>7 days</option>
            <option>30 days</option>
            <option>1 year</option>
            <option>All</option>
          </select>
          <SectionButton variant="ghost">Delete Old Messages</SectionButton>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsHelpCard() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Help & Support" icon={CircleHelp} active>
        <div className="space-y-3">
          <a href="https://support.uchat.app" className="block text-sm font-medium text-purple-600 hover:underline">Help Center</a>
          <a href="mailto:support@uchat.app" className="block text-sm font-medium text-purple-600 hover:underline">Report a Bug</a>
          <a href="https://uchat.app/privacy" className="block text-sm font-medium text-gray-600 hover:underline dark:text-gray-300">Privacy Policy</a>
          <a href="https://uchat.app/terms" className="block text-sm font-medium text-gray-600 hover:underline dark:text-gray-300">Terms of Service</a>
        </div>
      </SectionCard>

      <SectionCard title="About" icon={InfoIcon} active={false}>
        <p className="text-sm text-gray-500 dark:text-gray-400">App Version 1.0.1</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">....</p>
      
      </SectionCard>
    </div>
  );
}

function SettingsDangerCard({ onClose }: { onClose: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const logout = useAuthStore((state) => state.logout);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({ title: "Confirmation required", description: "Type DELETE to permanently delete the account.", className: "bg-red-600 text-white" });
      return;
    }
    if (!password) {
      toast({ title: "Password required", description: "Enter your current password to delete the account.", className: "bg-red-600 text-white" });
      return;
    }

    setIsDeleting(true);
    try {
      await authApi.deleteAccount(password);
      localStorage.removeItem("uchat_username");
      logout();
      toast({ title: "Account deleted", description: "Your account has been permanently removed.", className: "bg-green-600 text-white" });
      setConfirmOpen(false);
      onClose();
    } catch (error) {
      toast({ title: "Account deletion failed", description: error instanceof Error ? error.message : "Unable to delete your account.", className: "bg-red-600 text-white" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionCard title="DELETE ACCOUNT" icon={AlertTriangle} active={false}>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="text-base font-bold text-red-600">Delete Account Permanently</p>
           <div className="mt-4 flex gap-3">
            <SectionButton variant="danger" onClick={() => setConfirmOpen(true)}>Delete Account Permanently</SectionButton>
          </div>
        </div>
      </SectionCard>

      <AnimatePresence>
        {confirmOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <p className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Type “DELETE” to confirm this action.</p>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" placeholder="DELETE" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" placeholder="Current password" autoComplete="current-password" />
              <div className="mt-4 flex justify-end gap-3">
                <SectionButton variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</SectionButton>
                <SectionButton variant="danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Confirm"}</SectionButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function InfoIcon() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300">i</span>;
}

function SunMini(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" /></svg>;
}

function MoonMini(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>;
}

export default function SettingsModal({ open, onClose, initialSection }: SettingsModalProps) {
  const accountSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || initialSection !== "account") return;
    const timeout = window.setTimeout(() => {
      accountSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const focusTarget = accountSectionRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>("input, textarea, button");
      focusTarget?.focus();
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [open, initialSection]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="settings-modal"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-0 z-[200] flex flex-col bg-gray-50 dark:bg-gray-950"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-600">Uchat</p>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Close settings">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <SettingsAccountCard onClose={onClose} sectionRef={accountSectionRef} />
            <PrivacySettings />
            <SettingsNotificationsCard />
            <SettingsAppearanceCard />
            <SettingsStorageCard />
            <SettingsHelpCard />
            <SettingsDangerCard onClose={onClose} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
