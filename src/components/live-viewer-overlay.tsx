import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, Watch, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HostControls } from "@/components/host-controls";
import { WhiteboardMode } from "@/components/whiteboard-mode";

interface LiveViewerOverlayProps {
  open: boolean;
  isHost: boolean;
  sessionTitle?: string;
  contentType?: "url" | "upload" | "whiteboard";
  stream?: MediaStream | null;
  isLoading?: boolean;
  error?: string | null;
  onExit: () => void;
  onStop?: () => void;
  onRetry?: () => void;
  onOpenInNewWindow?: () => void;
  onSwitchTab?: () => void;
  onReaction?: () => void;
  onWhiteboardContentChange?: (content: string) => void;
  initialWhiteboardContent?: string | null;
  canReact?: boolean;
}

export function LiveViewerOverlay({
  open,
  isHost,
  sessionTitle,
  contentType = "url",
  stream,
  isLoading = false,
  error,
  onExit,
  onStop,
  onRetry,
  onOpenInNewWindow,
  onSwitchTab,
  onReaction,
  onWhiteboardContentChange,
  initialWhiteboardContent = null,
  canReact = false,
}: LiveViewerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(42);
  const [zoom, setZoom] = useState(1);
  const [quality, setQuality] = useState("720p");
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 200);
    return () => window.clearInterval(frame);
  }, [open]);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => undefined);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  const startReactionLongPress = () => {
    if (!canReact || !open) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      onReaction?.();
    }, 500);
  };

  const stopReactionLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const contentView = useMemo(() => {
    if (contentType === "whiteboard") {
      return (
        <WhiteboardMode
          open={open}
          isHost={isHost}
          sessionTitle={sessionTitle}
          initialContent={initialWhiteboardContent}
          onConnectionLost={false}
          onContentChange={(content) => onWhiteboardContentChange?.(content)}
          onStopSharing={() => onStop?.()}
        />
      );
    }

    if (contentType === "upload") {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-white/10 bg-gray-950 p-6 text-center text-gray-200">
          <div className="max-w-md space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/20 text-purple-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold">Shared upload</p>
            <p className="text-sm text-gray-400">This session is ready for uploaded media. The host can switch content from the control bar.</p>
          </div>
        </div>
      );
    }

    if (stream) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 bg-gray-950">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline autoPlay muted={isHost} />
          <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-white">
            Host is sharing a browser tab. Only content in that tab is visible.
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6 text-center text-gray-200">
        <div className="max-w-xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-600/20 text-purple-300">
            <Watch className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-semibold">Browser content preview</p>
            <p className="text-sm text-gray-400">Only sharing content within this app frame. Desktop notifications and other tabs remain hidden.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-300">
            <p className="font-medium text-white">Host action</p>
            <p className="mt-1">Select Frame lets the host choose which in-app content is streamed to viewers.</p>
          </div>
        </div>
      </div>
    );
  }, [contentType, open, isHost, sessionTitle, initialWhiteboardContent, onStop, onWhiteboardContentChange]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex flex-col bg-black/90"
      >
        <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4">
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
            onPointerDown={startReactionLongPress}
            onPointerUp={stopReactionLongPress}
            onPointerLeave={stopReactionLongPress}
            onPointerCancel={stopReactionLongPress}
          >
            <div className="aspect-video w-full bg-black landscape:aspect-[16/9]">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-gray-200">
                  <p className="text-2xl font-semibold">Stream unavailable</p>
                  <p className="text-sm text-gray-400">{error}</p>
                  <button type="button" onClick={onRetry} className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700">
                    Retry
                  </button>
                </div>
              ) : (
                contentView
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <button type="button" onClick={onExit} className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-2 text-white/80 transition hover:bg-black/60" aria-label="Exit live viewer">
              <X className="h-5 w-5" />
            </button>

            <HostControls
              isPlaying={isPlaying}
              progress={progress}
              zoom={zoom}
              quality={quality}
              onTogglePlayback={() => setIsPlaying((prev) => !prev)}
              onSeek={(value) => setProgress(value)}
              onPrev={() => setProgress((prev) => Math.max(0, prev - 10))}
              onNext={() => setProgress((prev) => Math.min(100, prev + 10))}
              onZoomIn={() => setZoom((prev) => Math.min(2, prev + 0.1))}
              onZoomOut={() => setZoom((prev) => Math.max(1, prev - 0.1))}
              onStop={() => onStop?.()}
              onQualityChange={setQuality}
              onFullscreen={() => onOpenInNewWindow?.()}
              onSwitchTab={() => onSwitchTab?.()}
              onExit={onExit}
              isHost={isHost}
              canReact={canReact}
              onReaction={onReaction}
            />
          </div>
        </div>


        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-sm text-white/80">
          {sessionTitle || "Live Share"}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
