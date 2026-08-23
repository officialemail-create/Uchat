import { LogOut, Settings, UserCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { LogoutButton } from "@/components/logout-button";
import { resolveAvatarUrl } from "@/lib/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProfileMenuProps = {
  mobile?: boolean;
};

export function ProfileMenu({ mobile = false }: ProfileMenuProps) {
  const { user } = useAuthStore();
  const avatarUrl = resolveAvatarUrl(user?.profilePicture ?? null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={mobile
            ? "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] text-gray-500 transition hover:bg-gray-100 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-gray-900"
            : "group flex w-full items-center gap-3 rounded-3xl px-3 py-3 text-left transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-900/80"}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-purple-100 font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
            <UserAvatar src={avatarUrl} alt={user?.displayName ?? "Profile"} size="md" className="h-full w-full" />
          </span>
          <span className={mobile ? "" : "max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-[10rem] group-hover:opacity-100"}>
            Profile
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={mobile ? "center" : "start"} side={mobile ? "top" : "right"} sideOffset={8} className="w-64 rounded-2xl border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 font-semibold text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
            <UserAvatar src={avatarUrl} alt={user?.displayName ?? "Profile"} size="md" className="h-full w-full" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.displayName ?? "Uchat user"}</span>
            <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">{user?.email ?? `@${user?.username ?? "user"}`}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
            <UserCircle className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutButton className="!w-full !justify-start !rounded-xl !px-3 !py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}