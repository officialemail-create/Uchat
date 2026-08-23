import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

interface SessionManagerProps {
  sessionStatus: "idle" | "active" | "ended";
  onReconnect: () => void;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  hostDisconnected: boolean;
  joined: boolean;
}

export function SessionManager({
  sessionStatus,
  onReconnect,
  reconnectAttempts,
  maxReconnectAttempts,
  hostDisconnected,
  joined,
}: SessionManagerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showEndedOverlay, setShowEndedOverlay] = useState(false);
  const progress = useMemo(() => Math.max(0, Math.round((reconnectAttempts / maxReconnectAttempts) * 100)), [reconnectAttempts, maxReconnectAttempts]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionStatus === "active") {
      setShowBanner(false);
      setShowEndedOverlay(false);
      return;
    }

    if (sessionStatus === "ended") {
      setShowEndedOverlay(true);
      timerRef.current = window.setTimeout(() => setShowEndedOverlay(false), 2000);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (!hostDisconnected) {
      setShowBanner(false);
      return;
    }

    setShowBanner(true);
  }, [hostDisconnected]);

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {hostDisconnected ? "Host disconnected. Reconnecting..." : sessionStatus === "ended" ? "Session ended" : joined ? "User joined session" : ""}
      </div>

      <AnimatePresence>
        {showBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none fixed inset-x-0 top-5 z-[200] flex justify-center px-4"
          >
            <div className="w-full max-w-md rounded-2xl border border-purple-400/40 bg-black/70 p-3 text-white shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">Host disconnected. Reconnecting...</span>
                <span className="text-purple-300">{reconnectAttempts}/{maxReconnectAttempts}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                onClick={onReconnect}
                className="mt-3 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Retry now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showEndedOverlay ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80"
          >
            <div className="rounded-3xl border border-white/10 bg-black/70 px-6 py-5 text-center text-white shadow-2xl backdrop-blur-md">
              <p className="text-lg font-semibold">Session ended</p>
              <p className="mt-2 text-sm text-gray-300">The host has ended the Live Share session.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
