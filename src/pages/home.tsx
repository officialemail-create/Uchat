import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chatStore";
import { useGetMessageStats } from "@workspace/api-client-react";
import { UchatLogoMark } from "@/components/uchat-logo";

const PALETTE = [
  "#8B5CF6","#6366f1","#8b5cf6","#ec4899",
  "#f59e0b","#ef4444","#06b6d4","#3b82f6",
];

const BG = "#0B0F19";
const CARD = "#1A1F2E";
const ACCENT = "#8B5CF6";

export default function Home() {
  const [, setLocation] = useLocation();
  const { setCurrentUsername, avatarColor, setAvatarColor } = useChatStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState<"name" | "avatar">("name");

  const { data: stats } = useGetMessageStats();

  useEffect(() => {
    const saved = localStorage.getItem("uchat_username");
    if (saved) { setCurrentUsername(saved); setLocation("/chat"); return; }

    const joinError = sessionStorage.getItem("uchat_join_error");
    const prevUsername = sessionStorage.getItem("uchat_prev_username");
    if (joinError) {
      setError(joinError);
      sessionStorage.removeItem("uchat_join_error");
      if (prevUsername) {
        setUsername(prevUsername);
        sessionStorage.removeItem("uchat_prev_username");
      }
    }
  }, [setLocation, setCurrentUsername]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length < 2 || clean.length > 20) { setError("Use 2–20 letters, numbers, or underscores."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) { setError("Letters, numbers, and underscores only"); return; }
    setStep("avatar");
  };

  const handleEnter = () => {
    const clean = username.trim();
    localStorage.setItem("uchat_username", clean);
    setCurrentUsername(clean);
    setLocation("/dashboard");
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-8 relative overflow-hidden select-none"
      style={{ background: BG }}
    >
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}0d 0%, transparent 65%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[300px] flex flex-col items-center gap-8 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <UchatLogoMark size={60} />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-[0.12em] text-white">UCHAT</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#A1A1AA" }}>Global community chat</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "name" ? (
            <motion.form
              key="name"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleNext}
              className="w-full flex flex-col gap-3"
            >
              <div className="relative">
                <input
                  autoFocus type="text" placeholder="Your name"
                  value={username} maxLength={20}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full h-12 px-4 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200"
                  style={{
                    border: `1px solid ${focused ? `${ACCENT}60` : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px",
                    background: CARD,
                  }}
                  data-testid="input-username"
                />
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -bottom-5 left-1 text-[11px]"
                      style={{ color: "#EF4444" }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit" disabled={!username.trim()}
                className="h-12 w-full rounded-[12px] text-sm font-semibold text-white transition-all duration-200 mt-1"
                style={{
                  background: username.trim() ? ACCENT : "rgba(255,255,255,0.07)",
                  opacity: username.trim() ? 1 : 0.4,
                  boxShadow: username.trim() ? `0 0 24px ${ACCENT}35` : "none",
                }}
                data-testid="button-next"
              >
                Next: choose your avatar
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center gap-5"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: avatarColor, boxShadow: `0 0 30px ${avatarColor}55` }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {username[0].toUpperCase()}
                </motion.div>
                <p className="text-sm font-semibold text-white">{username}</p>
                <p className="text-[12px]" style={{ color: "#A1A1AA" }}>Pick your color</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAvatarColor(color)}
                    className="w-12 h-12 rounded-full transition-all duration-150"
                    style={{
                      background: color,
                      transform: avatarColor === color ? "scale(1.18)" : "scale(1)",
                      boxShadow: avatarColor === color ? `0 0 0 2px ${BG}, 0 0 0 4px ${color}` : "none",
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setStep("name")}
                  className="flex-1 h-11 rounded-[12px] text-sm font-medium transition-colors"
                  style={{ background: CARD, color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Back
                </button>
                <button
                  onClick={handleEnter}
                  className="flex-1 h-11 rounded-[12px] text-sm font-semibold text-white transition-all"
                  style={{ background: ACCENT, boxShadow: `0 0 24px ${ACCENT}35` }}
                  data-testid="button-join"
                >
                  Join chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {stats !== undefined && (
          <div className="flex items-center gap-4 text-[12px]" style={{ color: "rgba(161,161,170,0.5)" }}>
            <span className="flex items-center gap-1.5">
              {(stats.onlineCount ?? 0) > 0 && (
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ACCENT }} />
              )}
              <strong className="tabular-nums" style={{ color: "#A1A1AA" }}>{stats.onlineCount ?? 0}</strong> online
            </span>
            <span className="w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span>
              <strong className="tabular-nums" style={{ color: "#A1A1AA" }}>{stats.totalMessages ?? 0}</strong> messages
            </span>
          </div>
        )}
      </motion.div>

      <p className="absolute bottom-6 text-[11px] tracking-wide" style={{ color: "rgba(161,161,170,0.3)" }}>
        No account needed
      </p>
    </div>
  );
}
