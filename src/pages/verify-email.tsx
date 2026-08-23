import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { authApi } from "@/lib/auth";
import { UchatLogoMark } from "@/components/uchat-logo";

const BG = "#0B0F19";
const ACCENT = "#8B5CF6";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setStatus("error"); setMessage("Missing verification token."); return; }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Email verified! You can now sign in.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6" style={{ background: BG }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] flex flex-col items-center gap-6 text-center"
      >
        <UchatLogoMark size={56} />

        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin" style={{ color: ACCENT }} />
            <p className="text-white font-medium">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={48} style={{ color: "#22C55E" }} />
            <div>
              <h2 className="text-xl font-bold text-white">Email verified!</h2>
              <p className="text-sm mt-2" style={{ color: "#A1A1AA" }}>{message}</p>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={48} style={{ color: "#EF4444" }} />
            <div>
              <h2 className="text-xl font-bold text-white">Verification failed</h2>
              <p className="text-sm mt-2" style={{ color: "#A1A1AA" }}>{message}</p>
            </div>
            <button
              onClick={() => setLocation("/login")}
              className="h-11 px-6 rounded-[12px] text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Back to login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
