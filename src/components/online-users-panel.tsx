import { motion, AnimatePresence } from "framer-motion";
import { X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#35c522","#6366f1","#8b5cf6","#ec4899","#f59e0b","#ef4444","#06b6d4","#3b82f6"];
const PANEL_BG = "#111827";
const ACCENT = "#c52287";

function autoAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface OnlineUsersPanelProps {
  open: boolean;
  users: string[];
  currentUsername: string;
  currentAvatarColor: string;
  onClose: () => void;
}

export default function OnlineUsersPanel({ open, users, currentUsername, currentAvatarColor, onClose }: OnlineUsersPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 md:hidden"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 z-30 flex flex-col w-[220px] md:w-[240px]"
            style={{
              background: PANEL_BG,
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: ACCENT }} />
                <span className="text-[13px] font-semibold text-white">
                  Online · {users.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full transition-colors"
                style={{ color: "#A1A1AA" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1">
              {users.map((user, i) => {
                const isMe = user === currentUsername;
                const color = isMe ? currentAvatarColor : autoAvatarColor(user);
                return (
                  <motion.div
                    key={user}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors",
                      isMe ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {user[0].toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: ACCENT, borderColor: PANEL_BG }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white truncate font-medium">{user}</p>
                      {isMe && <p className="text-[10px]" style={{ color: "rgba(161,161,170,0.5)" }}>you</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[11px] text-center" style={{ color: "rgba(161,161,170,0.3)" }}>
                Online members.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
