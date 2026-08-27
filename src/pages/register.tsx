import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { authApi } from "@/lib/auth";
import { UchatLogoMark } from "@/components/uchat-logo";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { socketService } from "@/services/socket";

const BG = "#0B0F19";
const CARD = "#1A1F2E";
const ACCENT = "#8B5CF6";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Contains uppercase", ok: /[A-Z]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["#EF4444", "#F59E0B", "#8B5CF6"];
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i < score ? colors[score - 1] : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: c.ok ? "#8B5CF6" : "rgba(255,255,255,0.3)" }}>
            {c.ok ? <Check size={10} /> : <X size={10} />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuthStore();
  const { setCurrentUsername } = useChatStore();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = (focused: boolean) => ({
    border: `1px solid ${focused ? `${ACCENT}60` : "rgba(255,255,255,0.08)"}`,
    borderRadius: "12px",
    background: CARD,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !username || !password || !confirmPassword) { setError("Please fill out every field."); return; }
    if (password !== confirmPassword) { setError("Passwords don’t match. Try again."); return; }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    setLoading(true);
    try {
      const normalizedEmail = email.trim();
      await authApi.register({
        email: normalizedEmail,
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        confirmPassword,
      });
      const loginResult = await authApi.login({ identifier: normalizedEmail, password });
      setUser(loginResult.user);
      setCurrentUsername(loginResult.user.username);
      localStorage.setItem("uchat_username", loginResult.user.username);
      await socketService.ensureAuthenticated();
      setLocation("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden" style={{ background: BG }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}0d 0%, transparent 65%)` }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] flex flex-col items-center gap-7 relative z-10"
      >
        <div className="flex flex-col items-center gap-3">
          <UchatLogoMark size={52} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Create account</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#A1A1AA" }}>Create your Uchat account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {[
            { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "Enter your email", autoComplete: "email" },
            { label: "Username", value: username, setter: setUsername, type: "text", placeholder: "Username", autoComplete: "username" },
            { label: "Display Name (optional)", value: displayName, setter: setDisplayName, type: "text", placeholder: "Your name", autoComplete: "name" },
          ].map(({ label, value, setter, type, placeholder, autoComplete }) => (
            <div key={label}>
              <label className="text-[11px] mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
              <input
                type={type} placeholder={placeholder} value={value} autoComplete={autoComplete}
                onChange={(e) => { setter(e.target.value); setError(""); }}
                className="w-full h-11 rounded-[12px] border border-white/10 bg-[#1A1F2E] px-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          ))}

          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} placeholder="Min. 8 characters"
                value={password} autoComplete="new-password"
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full h-11 rounded-[12px] border border-white/10 bg-[#1A1F2E] px-4 pr-11 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <AnimatePresence>
              {password && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <PasswordStrength password={password} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Confirm Password</label>
            <input
              type="password" placeholder="Repeat password" value={confirmPassword} autoComplete="new-password"
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="w-full h-11 rounded-[12px] border border-white/10 bg-[#1A1F2E] px-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
           
          </div>

          {error && <p className="text-[12px] text-center" style={{ color: "#EF4444" }}>{error}</p>}

          <button
            type="submit" disabled={loading}
            className="h-12 w-full rounded-[12px] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-1"
            style={{ background: ACCENT, opacity: loading ? 0.6 : 1, boxShadow: `0 0 24px ${ACCENT}35` }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : "Create Account"}
          </button>
        </form>

        <div className="text-center text-sm" style={{ color: "#A1A1AA" }}>
          Already have an account?{" "}
          <button onClick={() => setLocation("/login")} className="font-medium" style={{ color: ACCENT }}>
            Log in
          </button>
        </div>
      </motion.div>
    </div>
  );
}
