import { memo, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  src: string;
  duration?: number | null;
  isMine?: boolean;
  className?: string;
}

function fmt(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function createBars(length = 40): number[] {
  return Array.from({ length }, (_, index) => {
    const wave = Math.sin(index * 0.48 + 0.2) * 0.5 + Math.cos(index * 0.16 + 0.12) * 0.35;
    return Math.max(0.12, (wave + 1.2) / 2.4);
  });
}

function extractWaveformFromAudio(channel: Float32Array, count = 40): number[] {
  const step = Math.max(1, Math.floor(channel.length / count));
  const values = Array.from({ length: count }, (_, index) => {
    const start = index * step;
    const end = Math.min(channel.length, start + step);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      peak = Math.max(peak, Math.abs(channel[i]));
    }
    return peak;
  });
  const maxValue = Math.max(...values, 0.01);
  return values.map((value) => Math.max(0.12, Math.min(1, value / maxValue)));
}

const VoiceMessageBubble = memo(function VoiceMessageBubble({ src, duration, isMine = false, className }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ? duration / 1000 : 0);
  const [bars, setBars] = useState<number[]>(() => createBars());

  useEffect(() => {
    let cancelled = false;
    const ctx = new AudioContext();

    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((decoded) => {
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        setBars(extractWaveformFromAudio(channel, 40));
      })
      .catch(() => {
        if (!cancelled) setBars(createBars());
      })
      .finally(() => {
        if (!cancelled) {
          void ctx.close();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * audio.duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
  const playedColor = "#e9d5ff";
  const unplayedColor = "rgba(139,92,246,0.18)";

  return (
    <div className={cn("min-w-[220px] max-w-full rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-600/10 to-violet-500/5 p-3 shadow-sm", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const durationValue = audioRef.current?.duration ?? 0;
          if (durationValue && Number.isFinite(durationValue)) {
            setTotalDuration(durationValue);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-400/40 transition hover:scale-105"
          style={{ background: isMine ? "rgba(255,255,255,0.12)" : "rgba(139,92,246,0.16)", color: playedColor }}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <div className="relative flex h-12 flex-1 items-center gap-[4px] overflow-hidden rounded-2xl bg-black/10 px-2" onClick={handleSeek} role="slider" tabIndex={0} aria-label="Seek voice note">
          <div className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-purple-300/20" style={{ width: `${progress * 100}%` }} />
          <div
            className="pointer-events-none absolute top-1 bottom-1 w-[2px] rounded-full bg-purple-300 shadow-lg"
            style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%`, transform: "translateX(-50%)" }}
          />
          {bars.map((height, index) => (
            <div
              key={`${height}-${index}`}
              className="flex-1 rounded-full transition-colors duration-150"
              style={{
                height: `${Math.max(10, Math.round(height * 100))}%`,
                background: index / bars.length <= progress ? playedColor : unplayedColor,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium tabular-nums text-white/70">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(totalDuration)}</span>
      </div>
    </div>
  );
});

export default VoiceMessageBubble;
