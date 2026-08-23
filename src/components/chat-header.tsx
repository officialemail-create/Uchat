import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { ChevronLeft, X, Search, Users, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { UchatLogoMark } from "./uchat-logo";
import { formatLastSeen } from "@/lib/last-seen";


const HEADER_BG = "#111827";
const CARD = "#1A1F2E";

interface ChatHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUsersPanel: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
}

export default function ChatHeader({ searchQuery, onSearchChange, onOpenUsersPanel, onOpenSettings, onOpenAccount }: ChatHeaderProps) {
  const { onlineCount, isConnected, currentUsername, avatarColor, dataSaverMode } = useChatStore();
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();
  const [searchActive, setSearchActive] = useState(false);
  const [showQualityTip, setShowQualityTip] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastSeenLabel = formatLastSeen(user?.lastSeen ?? null, user, user) ?? 'Last seen recently';


  const handleLeave = () => {
    localStorage.removeItem("uchat_username");
    setLocation("/login");
  };

  const openSearch = () => {
    setSearchActive(true);
    setTimeout(() => searchRef.current?.focus(), 60);
  };

  const closeSearch = () => {
    setSearchActive(false);
    onSearchChange("");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && searchActive) closeSearch(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [searchActive]);

  return (
    <header
      className="h-[56px] flex items-center px-2 shrink-0 z-10"
      style={{ background: HEADER_BG, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      role="banner"
    >
      <AnimatePresence mode="wait">
        {searchActive ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }} className="flex items-center gap-2 w-full">
            <button onClick={closeSearch}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0"
              style={{ color: "rgba(255,255,255,0.5)" }} aria-label="Close search">
              <X className="w-5 h-5" />
            </button>
            <input
              ref={searchRef} type="text" value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/25"
              aria-label="Search messages"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange("")} className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
                      style={{ color: "rgba(255,255,255,0.35)" }} aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }} className="flex items-center justify-between w-full">
            <button onClick={handleLeave}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "rgba(255,255,255,0.45)" }} aria-label="Leave chat">
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Centre — title */}
            <div className="flex flex-col items-center gap-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">Global Chat</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Feel free to talk!</span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-0.5">
              <button onClick={onOpenUsersPanel}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }} title="Online users" aria-label="Online users">
                <Users className="w-4 h-4" />
              </button>
              <button onClick={openSearch}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }} title="Search" aria-label="Search messages">
                <Search className="w-4 h-4" />
              </button>

              {/* ⋮ menu → also opens settings */}
              <button
                onClick={onOpenSettings}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }} title="More options" aria-label="More options">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
