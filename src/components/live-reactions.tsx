import { AnimatePresence, motion } from "framer-motion";
import { Heart, Flame, Laugh, Clapperboard } from "lucide-react";
import { useCallback, useState } from "react";

type ReactionBurst = {
  id: number;
  emoji: string;
  x: number;
};

interface LiveReactionsProps {
  visible: boolean;
  isParticipant: boolean;
  onReact: (emoji: string) => void;
  onClose: () => void;
}

const REACTIONS = [
  { emoji: "❤️", label: "Heart", icon: Heart },
  { emoji: "🔥", label: "Fire", icon: Flame },
  { emoji: "😂", label: "Laugh", icon: Laugh },
  { emoji: "👏", label: "Clap", icon: Clapperboard },
] as const;

export function LiveReactions({ visible, isParticipant, onReact, onClose }: LiveReactionsProps) {
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);

  const emitBurst = useCallback((emoji: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const x = 14 + Math.floor(Math.random() * 72);
    setBursts((prev) => [...prev, { id, emoji, x }]);

    window.setTimeout(() => {
      setBursts((prev) => prev.filter((burst) => burst.id !== id));
    }, 3000);
  }, []);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    emitBurst(emoji);
    onClose();
  };

  if (!visible || !isParticipant) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
        <AnimatePresence>
          {bursts.map((burst) => (
            <motion.div
              key={burst.id}
              initial={{ opacity: 0, y: 20, x: `${burst.x}%` }}
              animate={{ opacity: 1, y: -160, x: `${burst.x}%` }}
              exit={{ opacity: 0, y: -190, x: `${burst.x}%` }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              className="pointer-events-none absolute text-3xl drop-shadow-lg"
              style={{ left: "50%", bottom: 0 }}
            >
              {burst.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-2 py-2 shadow-lg backdrop-blur-md"
        >
          {REACTIONS.map(({ emoji, label, icon: Icon }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReact(emoji)}
              aria-label={`Send ${label} reaction`}
              title={label}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-purple-600"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </motion.div>
      </div>
    </>
  );
}
