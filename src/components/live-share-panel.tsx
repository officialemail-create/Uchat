import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FileImage, FileText, FileVideo, Link2, MonitorPlay, PauseCircle, PencilLine, PlayCircle, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { P2PFileStreamer } from "@/components/p2p-file-streamer";

export type LiveShareSession = {
  id: string;
  roomId: string;
  hostId: string;
  hostName: string;
  status: "active" | "paused" | "ended";
  contentType: "url" | "upload" | "whiteboard";
  content: string;
  title: string;
  mimeType?: string;
  fileName?: string;
  createdAt: string;
  participantCount: number;
  participants: Array<{ id: string; name: string }>;
  reactions?: Array<{ emoji: string; userName: string }>;
};

interface LiveSharePanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  session: LiveShareSession | null;
  isHost: boolean;
  isJoined: boolean;
  onStart: (payload: { mode: "url" | "upload" | "whiteboard"; title: string; url?: string; file?: File | null; strokes?: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; size: number }> }) => Promise<void>;
  onUpdate: (patch: { status?: LiveShareSession["status"]; title?: string; content?: string; contentType?: LiveShareSession["contentType"]; mimeType?: string; fileName?: string }) => Promise<void>;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onEnd: () => Promise<void>;
  onReact: (emoji: string) => void;
}

export default function LiveSharePanel({
  open,
  onClose,
  session,
  currentUserId,
  currentUserName,
  isHost,
  isJoined,
  onStart,
  onUpdate,
  onJoin,
  onLeave,
  onEnd,
  onReact,
}: LiveSharePanelProps) {
  const [mode, setMode] = useState<"url" | "upload" | "whiteboard">("url");
  const [title, setTitle] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color: string; size: number }>>([]);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("url");
      setTitle("");
      setUrlValue("");
      setSelectedFile(null);
      setError(null);
      setStrokes([]);
      setDrawing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!canvasRef.current || mode !== "whiteboard") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokes.forEach((stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();
    });
  }, [strokes, mode]);

  const resetBoard = () => {
    setStrokes([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleStart = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "url") {
        const trimmed = urlValue.trim();
        if (!trimmed) throw new Error("Add a URL to share.");
        await onStart({ mode, title: title.trim() || "Shared URL", url: trimmed });
      } else if (mode === "upload") {
        if (!selectedFile) throw new Error("Select an image, video, or PDF to share.");
        await onStart({ mode, title: title.trim() || selectedFile.name, file: selectedFile });
      } else {
        await onStart({ mode, title: title.trim() || "Whiteboard", strokes });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Live Share.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoardPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setDrawing(true);
    setStrokes((prev) => [...prev, { x1: x, y1: y, x2: x, y2: y, color: "#8B5CF6", size: 3 }]);
  };

  const handleBoardPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !isHost || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setStrokes((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, x2: x, y2: y };
      return next;
    });
  };

  const handleBoardPointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (strokes.length) {
      const lastStroke = strokes[strokes.length - 1];
      const payload = JSON.stringify(strokes.map((stroke) => ({ ...stroke })));
      onUpdate({ content: payload, contentType: "whiteboard" }).catch(() => undefined);
      if (session?.status === "active") {
        // keep the UI responsive without forcing a re-render loop
      }
    }
  };

  const currentModeLabel = useMemo(() => {
    if (mode === "url") return "Open URL";
    if (mode === "upload") return "Upload content";
    return "Whiteboard";
  }, [mode]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed inset-0 z-[180] flex justify-end bg-black/30 backdrop-blur-[2px]"
        >
          <div className="h-full w-full max-w-[430px] border-l border-border bg-surface p-4 text-foreground shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live Share
                </div>
                <h3 className="mt-3 text-xl font-semibold">Share content in this room</h3>
                <p className="mt-1 text-sm text-muted">Choose a link, upload media, or start a quick whiteboard.</p>
              </div>
              <button onClick={onClose} className="rounded-full border border-border p-2 text-muted hover:bg-background/80 hover:text-foreground transition" aria-label="Close live share">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              {[{ id: "url", label: "URL", icon: Link2 }, { id: "upload", label: "Upload", icon: Upload }, { id: "whiteboard", label: "Whiteboard", icon: PencilLine }].map((item) => {
                const active = mode === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id as "url" | "upload" | "whiteboard")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-surface text-muted hover:text-foreground hover:bg-background/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-border bg-surface p-4">
              <label className="text-sm font-medium text-muted">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={currentModeLabel}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />

              {mode === "url" && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-muted">Open URL</label>
                  <input
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              )}

              {mode === "upload" && (
                <div className="mt-4">
                  <P2PFileStreamer
                    file={selectedFile}
                    isHost={isHost}
                    onFileSelected={(nextFile) => setSelectedFile(nextFile)}
                    onStreamingComplete={() => undefined}
                  />
                </div>
              )}

              {mode === "whiteboard" && (
                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-medium text-muted">Draw together</label>
                    <button onClick={resetBoard} className="text-xs text-muted hover:text-foreground transition">Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={220}
                    onPointerDown={handleBoardPointerDown}
                    onPointerMove={handleBoardPointerMove}
                    onPointerUp={handleBoardPointerUp}
                    onPointerLeave={handleBoardPointerUp}
                    className="w-full rounded-2xl border border-border bg-background"
                  />
                </div>
              )}

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!session && (
                <button onClick={handleStart} disabled={isSubmitting} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {isSubmitting ? "Starting…" : "Start Live Share"}
                </button>
              )}
              {session && isHost && (
                <button onClick={() => onUpdate({ status: session.status === "paused" ? "active" : "paused" })} className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-background/80 transition">
                  {session.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
              {session && isHost && (
                <button onClick={onEnd} className="rounded-2xl border border-destructive bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 transition">
                  End session
                </button>
              )}
              {session && !isHost && !isJoined && (
                <button onClick={onJoin} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Join Live Share
                </button>
              )}
              {session && !isHost && isJoined && (
                <button onClick={onLeave} className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-background/80 transition">
                  Leave session
                </button>
              )}
            </div>

            {session && (
              <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{session.title}</p>
                    <p className="text-xs text-muted">Hosted by {session.hostName}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                    {session.status === "paused" ? "Paused" : "Live"}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(["👍", "❤️", "😂"] as const).map((emoji) => (
                    <button key={emoji} onClick={() => onReact(emoji)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-lg text-foreground shadow-sm transition hover:bg-background/80">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
