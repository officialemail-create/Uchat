import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { authApi } from "@/lib/auth";
import { UchatLogoMark } from "@/components/uchat-logo";

const BG = "#0B0F19";
const CARD = "#1A1F2E";
const ACCENT = "#8B5CF6";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await authApi.forgotPassword(email.trim()).catch(() => {});
    setLoading(false);
    setDone(true);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6" style={{ background: BG }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] flex flex-col items-center gap-7 relative z-10"
      >
        <div className="flex flex-col items-center gap-3">
          <UchatLogoMark size={52} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Forgot password?</h1>
            <p className="text-[13px] mt-1" style={{ color: "#A1A1AA" }}>Enter your email and we'll send a reset link.</p>
          </div>
        </div>

        {done ? (
          <div className="w-full text-center flex flex-col gap-4">
            <div className="p-4 rounded-[12px] text-sm" style={{ background: `${ACCENT}15`, color: "#A1A1AA", border: `1px solid ${ACCENT}30` }}>
              If an account exists with that email, a reset link has been sent.
            </div>
            <button onClick={() => setLocation("/login")} className="text-sm" style={{ color: ACCENT }}>
              ← Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input
              type="email" placeholder="your@email.com" value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 text-sm text-white placeholder:text-white/25 outline-none transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", background: CARD }}
              onFocus={(e) => (e.currentTarget.style.borderColor = `${ACCENT}60`)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <button
              type="submit" disabled={loading || !email.trim()}
              className="h-12 w-full rounded-[12px] text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: ACCENT, opacity: loading || !email.trim() ? 0.5 : 1, boxShadow: `0 0 24px ${ACCENT}35` }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => setLocation("/login")} className="text-sm text-center" style={{ color: "#A1A1AA" }}>
              ← Back to login
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
