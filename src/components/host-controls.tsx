import { Maximize2, Mic, MonitorPlay, Pause, Play, SkipBack, SkipForward, Square, ZoomIn, ZoomOut } from "lucide-react";

interface HostControlsProps {
  isPlaying: boolean;
  progress: number;
  zoom: number;
  quality: string;
  onTogglePlayback: () => void;
  onSeek: (value: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onStop: () => void;
  onQualityChange: (quality: string) => void;
  onFullscreen: () => void;
  onSwitchTab?: () => void;
  onExit: () => void;
  isHost: boolean;
  canReact?: boolean;
  onReaction?: () => void;
}

const qualities = ["1080p", "720p", "480p", "360p"];

export function HostControls({
  isPlaying,
  progress,
  zoom,
  quality,
  onTogglePlayback,
  onSeek,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onStop,
  onQualityChange,
  onFullscreen,
  onSwitchTab,
  onExit,
  isHost,
  canReact = false,
  onReaction,
}: HostControlsProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-4 pt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onTogglePlayback} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onPrev} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation">
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" onClick={onNext} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation">
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">Sync</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onZoomOut} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation" aria-label="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">{zoom.toFixed(1)}x</div>
            <button type="button" onClick={onZoomIn} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation" aria-label="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </button>
            {isHost ? (
              <>
                <button type="button" onClick={onSwitchTab} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation" aria-label="Switch tab">
                  <MonitorPlay className="h-4 w-4" />
                </button>
                <button type="button" onClick={onStop} className="min-h-11 min-w-11 rounded-full bg-red-500/90 p-2 text-white transition hover:bg-red-500 touch-manipulation" aria-label="Stop sharing">
                  <Square className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled className="min-h-10 min-w-10 rounded-full border border-white/10 bg-gray-500/20 px-3 py-2 text-xs font-semibold text-gray-300 opacity-60">
            <span className="inline-flex items-center gap-2"><Mic className="h-3.5 w-3.5" />VoiceChat</span>
          </button>
          <button type="button" disabled className="min-h-10 min-w-10 rounded-full border border-white/10 bg-gray-500/20 px-3 py-2 text-xs font-semibold text-gray-300 opacity-60">
            Recording
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-purple-500"
              aria-label="Seek live share"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-white/70">
              {qualities.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onQualityChange(option)}
                  className={`rounded-full px-2 py-1 transition ${quality === option ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/10"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {canReact ? (
              <button type="button" onClick={onReaction} className="min-h-11 rounded-full bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 touch-manipulation" aria-label="Send a reaction">
                Reaction
              </button>
            ) : null}
            <button type="button" onClick={onFullscreen} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation" aria-label="Open viewer in a new window">
              <Maximize2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={onExit} className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 touch-manipulation" aria-label="Exit viewer">
              <Square className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
