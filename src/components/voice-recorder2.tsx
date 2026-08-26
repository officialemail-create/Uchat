import React, { useCallback, useEffect, useRef, useState, useImperativeHandle } from "react";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, durationMs: number, mimeType: string) => void;
  onCancel: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export type VoiceRecorderHandle = {
  start: () => void;
  stop: () => void;
  isRecording: () => boolean;
};

type Phase = "idle" | "recording" | "preview";

const ACCENT = "#2563eb";
const BG = "#0B0F19";
const CARD = "#111216";

function getRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((type) => MediaRecorder.isTypeSupported(type));
}

function fmt(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function createBars(length = 40): number[] {
  return Array.from({ length }, () => 0.18 + Math.random() * 0.6);
}

function computeLiveBars(analyser: AnalyserNode, count = 40): number[] {
  const buffer = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index / count) * buffer.length);
    const end = Math.min(buffer.length, Math.floor(((index + 1) / count) * buffer.length));
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      sum += Math.abs(buffer[i] - 128);
    }
    const avg = sum / Math.max(1, end - start) / 128;
    return Math.max(0.12, Math.min(1, avg * 1.4));
  });
}

function createWaveformData(channel: Float32Array, length = 40): number[] {
  const step = Math.max(1, Math.floor(channel.length / length));
  const values = Array.from({ length }, (_, index) => {
    const start = index * step;
    const end = Math.min(channel.length, start + step);
    let peak = 0;
    for (let position = start; position < end; position += 1) {
      peak = Math.max(peak, Math.abs(channel[position]));
    }
    return peak;
  });
  const maxValue = Math.max(...values, 0.01);
  return values.map((value) => Math.max(0.12, Math.min(1, value / maxValue)));
}

const VoiceRecorder = React.forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(
  ({ onSend, onCancel, onRecordingChange }, ref) => {
    const [phase, setPhase] = useState<Phase>("idle");
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [waveformData, setWaveformData] = useState<number[]>(() => createBars());
    const [previewBars, setPreviewBars] = useState<number[]>(() => createBars());
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewDuration, setPreviewDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationRef = useRef(0);
    const recordingRef = useRef(false);
    const visibilityHandlerRef = useRef<(() => void) | null>(null);
    const rafRef = useRef<number | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    // notify parent when recording changes
    useEffect(() => {
      if (onRecordingChange) onRecordingChange(isRecording);
    }, [isRecording, onRecordingChange]);

    // duration timer
    useEffect(() => {
      if (!isRecording) return;
      const id = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);
      return () => clearInterval(id);
    }, [isRecording]);

    // start/stop side effects
    useEffect(() => {
      let cancelled = false;
      if (!isRecording) return;

      const start = async () => {
        setError(null);
        setDuration(0);
        setWaveformData(createBars());
        chunksRef.current = [];

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;

          const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextConstructor) throw new Error("Audio recording is not supported on this device.");
          const audioContext = new AudioContextConstructor();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.85;
          const src = audioContext.createMediaStreamSource(stream);
          src.connect(analyser);
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;

          const loop = () => {
            if (!analyserRef.current || !recordingRef.current) return;
            setWaveformData(computeLiveBars(analyserRef.current));
            rafRef.current = window.requestAnimationFrame(loop);
          };

          rafRef.current = window.requestAnimationFrame(loop);

          const mimeType = getRecorderMimeType();
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
            if (blob.size > 5 * 1024 * 1024) {
              setError("Voice note must be smaller than 5 MB.");
              setPhase("idle");
              setIsRecording(false);
              return;
            }
            setAudioBlob(blob);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            // attempt to get a rough duration (fallback to duration state)
            setPreviewDuration(Math.max(1, duration));
            setCurrentTime(0);
            setPhase("preview");
            setIsRecording(false);
            chunksRef.current = [];
          };

          mediaRecorderRef.current = recorder;
          const handleVisibilityChange = () => {
            if (document.hidden && recorder.state === "recording") recorder.pause();
            if (!document.hidden && recorder.state === "paused") recorder.resume();
          };
          visibilityHandlerRef.current = handleVisibilityChange;
          document.addEventListener("visibilitychange", handleVisibilityChange);
          recorder.start();
          setPhase("recording");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")) {
            toast({ title: "Permission denied. Please allow access in settings." });
          }
          setIsRecording(false);
          setPhase("idle");
        }
      };

      void start();

      return () => {
        cancelled = true;
        if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
        if (visibilityHandlerRef.current) {
          document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
          visibilityHandlerRef.current = null;
        }
      };
    }, [isRecording, toast]);

    // decode preview waveform after recording stops
    useEffect(() => {
      if (!previewUrl) return;
      let cancelled = false;
      const decode = async () => {
        try {
          const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextConstructor) return;
          const audioContext = new AudioContextConstructor();
          const resp = await fetch(previewUrl);
          const arr = await resp.arrayBuffer();
          const decoded = await audioContext.decodeAudioData(arr.slice(0));
          if (cancelled) { void audioContext.close(); return; }
          const channel = decoded.getChannelData(0);
          setPreviewBars(createWaveformData(channel));
          setPreviewDuration(Math.max(1, Math.round(decoded.duration)));
          await audioContext.close();
        } catch (e) {
          // ignore decode errors
        }
      };
      void decode();
      return () => { cancelled = true; };
    }, [previewUrl]);

    useEffect(() => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const start = useCallback(() => {
      setPhase("idle");
      durationRef.current = 0;
      recordingRef.current = true;
      setIsRecording(true);
    }, []);

    const stop = useCallback(() => {
      recordingRef.current = false;
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      // stop tracks
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
    }, []);

    const handleCancel = () => {
      recordingRef.current = false;
      // cleanup
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") void audioContextRef.current.close();
      setPreviewUrl(null);
      setAudioBlob(null);
      setPreviewDuration(0);
      setPhase("idle");
      onCancel();
    };

    const handleSend = async () => {
      if (!audioBlob) return;
      onSend(audioBlob, Math.max(1, Math.round((previewDuration || duration) * 1000)), audioBlob.type || "audio/webm");
      // cleanup
      setPreviewUrl(null);
      setAudioBlob(null);
      setPreviewDuration(0);
      setPhase("idle");
      onCancel();
    };

    const togglePlay = async () => {
      const audio = previewAudioRef.current;
      if (!audio || !previewUrl) return;
      try {
        if (isPreviewPlaying) { audio.pause(); setIsPreviewPlaying(false); } else { await audio.play(); setIsPreviewPlaying(true); }
      } catch { setIsPreviewPlaying(false); }
    };

    const onPreviewTimeUpdate = () => { const audio = previewAudioRef.current; if (!audio) return; setCurrentTime(audio.currentTime); };

    useImperativeHandle(ref, () => ({ start, stop, isRecording: () => isRecording }));

    const progress = previewDuration > 0 ? Math.min(1, Math.max(0, currentTime / previewDuration)) : 0;

    return (
      <div className="flex flex-col gap-3 px-3 py-3" style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <audio ref={previewAudioRef} src={previewUrl ?? undefined} preload="metadata" onTimeUpdate={onPreviewTimeUpdate} onEnded={() => { setIsPreviewPlaying(false); setCurrentTime(0); }} />

        <div className="flex items-center justify-between text-[12px] text-white/70">
          <span>{phase === "idle" ? "Voice note" : phase === "recording" ? "Recording" : "Preview"}</span>
          <span>{fmt(phase === "recording" ? duration : previewDuration || duration)}</span>
        </div>

        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
            <button type="button" onClick={() => { if (!isRecording) start(); else stop(); }} className={`flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/30 bg-purple-600/10 text-purple-100 transition ${isRecording ? "scale-95 bg-red-600/30" : "hover:bg-purple-600/15"}`} aria-label="Record voice note">
              <Mic className="h-6 w-6" />
            </button>
            <p className="mt-3 text-[13px] text-white/60">Tap the microphone to begin</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-3">
            <div className="flex h-12 items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-2">
              {waveformData.map((height, index) => (
                <div key={index} className="flex-1 rounded-full transition-all duration-150" style={{ height: `${Math.max(10, Math.round(height * 100))}%`, background: `rgba(139,92,246,${0.45 + height * 0.35})` }} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => stop()} className="px-4 py-2 rounded-lg bg-red-600 text-white">Stop recording</button>
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-3">
            <div className="flex h-12 items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-2">
              {previewBars.map((height, index) => (
                <div key={index} className="flex-1 rounded-full transition-all duration-150" style={{ height: `${Math.max(10, Math.round(height * 100))}%`, background: `rgba(139,92,246,${0.45 + height * 0.35})` }} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={togglePlay} aria-label={isPreviewPlaying ? "Pause preview" : "Play preview"} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white transition hover:bg-white/15">
                  {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="text-sm text-white/70">{fmt(previewDuration)}</div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={handleCancel} className="px-3 py-2 rounded-lg bg-gray-800 text-white/80 flex items-center gap-2 transition hover:bg-gray-700"><Trash2 className="w-4 h-4" />Discard</button>
                <button type="button" onClick={handleSend} className="px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: ACCENT, color: "white" }} disabled={!audioBlob}><Send className="w-4 h-4" />Send</button>
              </div>
            </div>

            <div className="h-2 w-full bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-white/50" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}

        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>
    );
  }
);

export default VoiceRecorder;

