import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UchatLogoMark } from "@/components/uchat-logo";
import { useChatStore } from "@/store/chatStore";
import { socketService } from "@/services/socket";
import { authApi } from "@/lib/auth";

const BG = "#0B0F19";
const CARD = "#1A1F2E";
const ACCENT = "#8B5CF6";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuthStore();
  const { setCurrentUsername } = useChatStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState<{ email?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();
    if (!trimmedIdentifier || !trimmedPassword) { setError("Enter your email/username and password."); return; }
    setLoading(true);
    console.log('Login request payload:', { identifier: trimmedIdentifier });
    try {
      socketService.disconnect();
      const result = await authApi.login({
        identifier: trimmedIdentifier,
        password: trimmedPassword,
      });

      const nextUser = result.user;
      setUser(nextUser);
      if (nextUser) {
        setCurrentUsername(nextUser.username);
        localStorage.setItem('uchat_username', nextUser.username);
      }
      await socketService.ensureAuthenticated();
      setLocation('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      let message = 'Login failed';
      if (err instanceof Error) {
        const status = (err as any).status as number | undefined;
        if (status === 401 || err.message.toLowerCase().includes('invalid login') || err.message.toLowerCase().includes('invalid credentials') || err.message.toLowerCase().includes('invalid credentials')) {
          message = 'Invalid email or password. Please try again.';
        } else if (err.message && err.message.toLowerCase().includes('fetch')) {
          message = 'Unable to connect. Please check your internet connection.';
        } else {
          message = err.message;
        }
        if (err.message && err.message.toLowerCase().includes('verify')) {
          setNeedsVerify({ email: trimmedIdentifier.includes('@') ? trimmedIdentifier : undefined });
          message = '';
        }
      } else if ((err as any)?.status === 401) {
        message = 'Invalid email or password. Please try again.';
      }
      if (message) setError(message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  if (needsVerify) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6" style={{ background: BG }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px] flex flex-col items-center gap-6 text-center"
        >
          <UchatLogoMark size={56} />
          <div>
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-sm mt-2" style={{ color: "#A1A1AA" }}>
              Your email isn't verified yet. Check your inbox and click the link.
            </p>
          </div>
          {needsVerify.email && (
            <button
              className="text-sm underline"
              style={{ color: ACCENT }}
              onClick={async () => {
                if (!needsVerify.email) return;
                try {
                  await authApi.resendVerification(needsVerify.email);
                  setError('Verification email resent');
                } catch {
                  setError('Unable to resend verification email.');
                }
              }}
            >
              Resend verification email
            </button>
          )}
          <button className="text-sm" style={{ color: "#A1A1AA" }} onClick={() => setNeedsVerify(null)}>
            Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ background: BG }}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT}0d 0%, transparent 65%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] flex flex-col items-center gap-8 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <UchatLogoMark size={60} />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-[0.12em] text-white">Uchat</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#A1A1AA" }}>Connect with friends</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="text"
            placeholder="Email or Username"
            value={identifier}
            autoComplete="username"
            onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
            className="w-full h-12 rounded-[12px] border border-white/10 bg-[#1A1F2E] px-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full h-12 rounded-[12px] border border-white/10 bg-[#1A1F2E] px-4 pr-11 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            <button
              type="button" onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="text-right -mt-1">
            <button
              type="button" onClick={() => setLocation("/forgot-password")}
              className="text-xs"
              style={{ color: ACCENT }}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="text-[12px] text-center" style={{ color: "#EF4444" }}>{error}</p>
          )}

          <button
            type="submit" disabled={loading || !identifier.trim() || !password}
            className="h-12 w-full rounded-[12px] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-1"
            style={{
              background: ACCENT,
              opacity: loading || !identifier.trim() || !password ? 0.5 : 1,
              boxShadow: `0 0 24px ${ACCENT}35`,
            }}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Logging in…</> : "Log In"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <button
            onClick={() => setLocation("/register")}
            className="h-12 w-full rounded-[12px] text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Create Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
