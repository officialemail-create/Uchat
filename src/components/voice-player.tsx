import { useRef, useState, useEffect, memo } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoicePlayerProps {
  src: string;
  duration?: number | null;
  isOwn: boolean;
  dataSaverMode?: boolean;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PLACEHOLDER_BARS = Array.from({ length: 40 }, (_, i) =>
  Math.max(0.08, 0.3 + 0.55 * Math.abs(Math.sin(i * 0.73 + i * i * 0.04))),
);

const VoicePlayer = memo(function VoicePlayer({ src, duration, isOwn, dataSaverMode }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ? duration / 1000 : 0);
  const [bars, setBars] = useState<number[]>(PLACEHOLDER_BARS);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (dataSaverMode) { setBars(PLACEHOLDER_BARS); return; }
    let cancelled = false;
    const ctx = new AudioContext();

    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => (cancelled ? null : ctx.decodeAudioData(buf)))
      .then((decoded) => {
        if (!decoded || cancelled) return;
        const data = decoded.getChannelData(0);
        const count = 40;
        const step = Math.floor(data.length / count);
        const raw = Array.from({ length: count }, (_, i) => {
          let max = 0;
          for (let j = i * step; j < Math.min((i + 1) * step, data.length); j++) {
            if (Math.abs(data[j]) > max) max = Math.abs(data[j]);
          }
          return max;
        });
        const maxVal = Math.max(...raw, 0.01);
        setBars(raw.map((v) => Math.max(0.06, v / maxVal)));
      })
      .catch(() => setBars(PLACEHOLDER_BARS))
      .finally(() => ctx.close());

    return () => { cancelled = true; };
  }, [src, dataSaverMode]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); }
    else { a.play(); setIsPlaying(true); }
  };

  const cycleSpeed = () => {
    const rates = [1, 1.5, 2];
    const next = rates[(rates.indexOf(speed) + 1) % rates.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = frac * a.duration;
    setCurrentTime(frac * a.duration);
  };

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
  const playedCount = Math.floor(progress * bars.length);

  /* Own: bright white for played, dim for unplayed. Others: purple accent */
  const playedColor = isOwn ? "rgba(255,255,255,0.9)" : "#8B5CF6";
  const unplayedColor = isOwn ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.18)";

  return (
    <div className="flex flex-col gap-1.5 w-[230px] min-w-0">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration ?? 0;
          if (d && isFinite(d)) setTotalDuration(d);
        }}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />

      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isOwn ? "rgba(255,255,255,0.12)" : "rgba(34,197,94,0.15)",
          }}
        >
          {isPlaying
            ? <Pause className="w-[14px] h-[14px]" style={{ color: playedColor }} />
            : <Play className="w-[14px] h-[14px] ml-0.5" style={{ color: playedColor }} />}
        </button>

        {/* Waveform */}
        <div
          className="flex-1 flex items-center gap-[2px] h-9 cursor-pointer select-none"
          onClick={handleSeek}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${Math.max(10, Math.round(h * 100))}%`,
                background: i < playedCount ? playedColor : unplayedColor,
                transition: "background 0.08s",
              }}
            />
          ))}
        </div>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 transition-all active:scale-90"
          style={{
            color: playedColor,
            background: isOwn ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.1)",
            minWidth: "26px",
            textAlign: "center",
          }}
        >
          {speed}x
        </button>
      </div>

      {/* Time row */}
      <div className="flex items-center justify-between px-0.5 -mt-0.5">
        <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
          {fmt(currentTime)}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
          {fmt(totalDuration)}
        </span>
      </div>
    </div>
  );
});

export default VoicePlayer;
