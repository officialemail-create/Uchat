import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LiveShareTriggerProps {
  onOpen: () => void;
  activeSession?: boolean;
}

export function LiveShareTrigger({ onOpen, activeSession = false }: LiveShareTriggerProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!activeSession) return;
    const timer = window.setTimeout(() => setShowHint(true), 400);
    return () => window.clearTimeout(timer);
  }, [activeSession]);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const isFromRightEdge = touchStart.current.x > window.innerWidth - 44;

    if (isFromRightEdge && deltaX < -36 && Math.abs(deltaY) < 60) {
      onOpen();
    }

    touchStart.current = null;
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="hidden rounded-full border border-purple-200 bg-white/90 px-3 py-2 text-sm font-medium text-purple-700 shadow-sm transition hover:bg-purple-50 dark:border-purple-900/40 dark:bg-gray-900/90 dark:text-purple-300 dark:hover:bg-purple-900/20 sm:inline-flex"
      >
        Live Share
      </button>

      <button
        type="button"
        onClick={onOpen}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Open live share"
        className="fixed bottom-24 right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-purple-200 bg-purple-600 text-white shadow-lg transition hover:scale-105 sm:hidden"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {showHint && activeSession ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-40 right-3 z-40 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700 shadow-sm sm:hidden"
          >
            Live share active
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
