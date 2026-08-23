import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[#0f172a]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      role="status"
      aria-label="Loading Uchat"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <motion.img
          src="/logo.ico"
          alt="Uchat"
          className="h-24 w-24 rounded-[22%] object-contain shadow-2xl shadow-purple-950/40 sm:h-32 sm:w-32"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        <span className="text-xl font-semibold tracking-[0.18em] text-white sm:text-2xl">Uchat</span>
        <span className="splash-loading-label text-sm text-white/60">Loading...</span>
      </div>
    </motion.div>
  );
}