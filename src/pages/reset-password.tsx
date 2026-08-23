import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { authApi } from "@/lib/auth";
import { UchatLogoMark } from "@/components/uchat-logo";

const BG = "#0B0F19";
const CARD = "#1A1F2E";
const ACCENT = "#8B5CF6";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p className="text-white">Invalid reset link.</p>
          <button onClick={() => setLocation("/login")} className="mt-4 text-sm" style={{ color: ACCENT }}>Back to login</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password, confirmPassword });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6" style={{ background: BG }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[340px] flex flex-col items-center gap-6 text-center">
          <CheckCircle size={56} style={{ color: "#22C55E" }} />
          <div>
            <h2 className="text-xl font-bold text-white">Password reset!</h2>
            <p className="text-sm mt-2" style={{ color: "#A1A1AA" }}>You can now log in with your new password.</p>
          </div>
          <button onClick={() => setLocation("/login")} className="h-12 px-8 rounded-[12px] text-sm font-semibold text-white" style={{ background: ACCENT }}>
            Log In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6" style={{ background: BG }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] flex flex-col items-center gap-7"
      >
        <div className="flex flex-col items-center gap-3">
          <UchatLogoMark size={52} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Reset password</h1>
            <p className="text-[13px] mt-1" style={{ color: "#A1A1AA" }}>Choose a new password for your account.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {[
            { label: "New Password", value: password, setter: setPassword, placeholder: "Min. 8 characters" },
            { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword, placeholder: "Repeat password" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-[11px] mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} placeholder={placeholder} value={value}
                  onChange={(e) => { setter(e.target.value); setError(""); }}
                  className="w-full h-11 px-4 pr-11 text-sm text-white placeholder:text-white/25 outline-none transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", background: CARD }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${ACCENT}60`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          {error && <p className="text-[12px] text-center" style={{ color: "#EF4444" }}>{error}</p>}

          <button
            type="submit" disabled={loading}
            className="h-12 w-full rounded-[12px] text-sm font-semibold text-white flex items-center justify-center gap-2 mt-1"
            style={{ background: ACCENT, opacity: loading ? 0.6 : 1, boxShadow: `0 0 24px ${ACCENT}35` }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting…</> : "Reset Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
