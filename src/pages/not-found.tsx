import { useLocation } from "wouter";
import { UchatLogoMark } from "@/components/uchat-logo";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: "#0B0F19" }}
    >
      <UchatLogoMark size={52} />
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white tabular-nums">404</h1>
        <p className="text-sm" style={{ color: "#A1A1AA" }}>This page doesn't exist</p>
      </div>
      <button
        onClick={() => setLocation("/")}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: "#8B5CF6", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}
      >
        Go home
      </button>
    </div>
  );
}
