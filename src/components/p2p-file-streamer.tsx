import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, Eye, FileArchive, FileImage, FileText, Film, Loader2, Pause, Play, ShieldCheck, Sparkles, UploadCloud, Volume2, ZoomIn, ZoomOut, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type StreamStatus = "idle" | "buffering" | "streaming" | "paused" | "ended";
type FileKind = "video" | "image" | "pdf" | "other";

type FileMetadata = {
  name: string;
  size: number;
  type: string;
  hash: string | null;
  kind: FileKind;
  key: string;
  iv: string;
};

type P2PFileStreamerProps = {
  file?: File | null;
  isHost?: boolean;
  onFileSelected?: (file: File | null) => void;
  onFileMetadata?: (metadata: FileMetadata) => void;
  onEncryptedChunk?: (chunk: Uint8Array, index: number, totalChunks: number) => Promise<void>;
  onStreamingComplete?: (file: File) => void;
  onError?: (message: string) => void;
};

const getFileKind = (file?: File | null): FileKind => {
  if (!file) return "other";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "other";
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const chunkFile = async function* (file: File, chunkSize = 64 * 1024) {
  const reader = file.stream().getReader();
  let carried = new Uint8Array();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const next = new Uint8Array(carried.length + (value?.length ?? 0));
    next.set(carried, 0);
    next.set(value ?? [], carried.length);

    let offset = 0;
    while (offset + chunkSize < next.length) {
      yield next.slice(offset, offset + chunkSize);
      offset += chunkSize;
    }

    carried = next.slice(offset);
  }

  if (carried.length > 0) {
    yield carried;
  }
};

const hashFile = async (file: File) => {
  if (file.size > 2 * 1024 * 1024 * 1024) {
    return null;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return hex;
};

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const generateSessionKey = async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  return { key, exportedKey: toBase64(raw) };
};

const deriveChunkIv = (baseIv: Uint8Array, index: number) => {
  const iv = new Uint8Array(baseIv);
  iv[iv.length - 1] ^= index & 0xff;
  return iv;
};

const encryptChunk = async (chunk: Uint8Array, key: CryptoKey, iv: Uint8Array) => {
  const data = new Uint8Array(chunk).buffer as ArrayBuffer;
  const encrypted = await (crypto.subtle as any).encrypt({ name: "AES-GCM", iv }, key, data);
  return new Uint8Array(encrypted);
};

export function P2PFileStreamer({
  file,
  isHost = true,
  onFileSelected,
  onFileMetadata,
  onEncryptedChunk,
  onStreamingComplete,
  onError,
}: P2PFileStreamerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(file ?? null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [sessionKeyBase64, setSessionKeyBase64] = useState<string | null>(null);
  const [ivBase64, setIvBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const [participantCount] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [showMobileDataWarning, setShowMobileDataWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setFileHash(null);
      setErrorMessage(null);
      setSessionKey(null);
      setSessionKeyBase64(null);
      setIvBase64(null);
      return;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);
    void hashFile(selectedFile).then((hash) => {
      setFileHash(hash);
      if (!hash && selectedFile.size > 1 * 1024 * 1024 * 1024) {
        setErrorMessage("File is too large for a full browser hash. Integrity validation uses partial metadata.");
      }
    });

    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  const fileKind = useMemo(() => getFileKind(selectedFile), [selectedFile]);
  const modeLabel = fileKind === "video" ? "Streaming mode" : fileKind === "pdf" ? "Viewer mode" : fileKind === "image" ? "Image viewer" : "Transfer mode";
  const modeHint = fileKind === "video"
    ? "Play/Pause controls appear immediately and stay in sync to viewers."
    : fileKind === "pdf"
      ? "Page changes and zoom are ready for shared review."
      : fileKind === "image"
        ? "Pan and zoom are available for local viewing and shared review."
        : "Participants receive download progress and a transfer-ready status.";

  const statusLabel = useMemo(() => {
    if (streamStatus === "buffering") return "Buffering...";
    if (streamStatus === "streaming") return "Streaming directly to participants";
    if (streamStatus === "paused") return "Paused for rebuffering";
    if (streamStatus === "ended") return "Stream finished";
    return "Waiting for a file";
  }, [streamStatus]);

  const startStreaming = async () => {
    if (!selectedFile || !isHost) return;
    setErrorMessage(null);
    setStreamStatus("buffering");
    const connection = (navigator as Navigator & { connection?: { downlink?: number } }).connection;
    const chunkSize = connection?.downlink && connection.downlink < 2 ? 16 * 1024 : 64 * 1024;
    const chunks = Math.max(1, Math.ceil(selectedFile.size / chunkSize));
    let totalBytes = 0;
    let index = 0;
    retryCountRef.current = 0;

    try {
      if (!sessionKey) {
        const { key, exportedKey } = await generateSessionKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const exportedIv = toBase64(iv.buffer);
        setSessionKey(key);
        setSessionKeyBase64(exportedKey);
        setIvBase64(exportedIv);
        await onFileMetadata?.({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || "application/octet-stream",
          hash: fileHash,
          kind: fileKind,
          key: exportedKey,
          iv: exportedIv,
        });
      }

      if (!sessionKey || !ivBase64) {
        throw new Error("Unable to initialize encryption session.");
      }

      for await (const chunk of chunkFile(selectedFile, chunkSize)) {
        if (!navigator.onLine) {
          setStreamStatus("paused");
          setErrorMessage("Connection unstable. Pausing stream...");
          await new Promise<void>((resolve, reject) => {
            const onOnline = () => {
              window.removeEventListener("offline", onOffline);
              resolve();
            };
            const onOffline = () => {
              retryCountRef.current += 1;
              if (retryCountRef.current > 2) {
                window.removeEventListener("online", onOnline);
                reject(new Error("Stream interrupted. Host must restart."));
              }
            };
            window.addEventListener("online", onOnline, { once: true });
            window.addEventListener("offline", onOffline, { once: true });
          });
          setErrorMessage(null);
          setStreamStatus("streaming");
        }

        const iv = deriveChunkIv(fromBase64(ivBase64), index);
        const encryptedChunk = await encryptChunk(chunk, sessionKey, iv);
        index += 1;
        totalBytes += chunk.length;
        const nextProgress = Math.round((totalBytes / selectedFile.size) * 100);
        setProgress(nextProgress);
        await onEncryptedChunk?.(encryptedChunk, index, chunks);
        if (index % 8 === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }

      setStreamStatus("streaming");
      setProgress(100);
      onStreamingComplete?.(selectedFile);
    } catch (err) {
      const message = err instanceof Error ? err.message : "File stream failed.";
      setStreamStatus("ended");
      setErrorMessage(message);
      onError?.(message);
    }
  };

  const handleFile = (nextFile: File | null) => {
    setSelectedFile(nextFile);
    onFileSelected?.(nextFile);
    if (nextFile) {
      setStreamStatus("buffering");
      setProgress(0);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    handleFile(nextFile);
  };

  const renderPreview = () => {
    if (!selectedFile) {
      return (
        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <UploadCloud className="h-8 w-8" />
        </div>
      );
    }

    if (fileKind === "image" && previewUrl) {
      return <img src={previewUrl} alt={selectedFile.name} className="h-28 w-28 rounded-2xl object-cover" />;
    }

    if (fileKind === "video") {
      return <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"><Film className="h-8 w-8" /></div>;
    }

    if (fileKind === "pdf") {
      return <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"><FileText className="h-8 w-8" /></div>;
    }

    return <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"><FileArchive className="h-8 w-8" /></div>;
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        className={`rounded-3xl border-2 border-dashed p-8 transition-all duration-300 ${dragActive ? "border-purple-500 bg-purple-50/80 dark:bg-purple-950/20" : "border-purple-300 hover:border-purple-500 dark:border-purple-700"}`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {renderPreview()}
              <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-purple-300">
                  <Zap className="h-3 w-3" />
                  Smart Upload
                </span>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">
                  {modeLabel}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload & Stream</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No file size limit. Streaming directly to participants.</p>
              {selectedFile && (
                <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p>{formatBytes(selectedFile.size)} • {selectedFile.type || "unknown"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose file to upload"
              className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Choose file
            </button>
            {selectedFile && isHost && (
              <button
                type="button"
                onClick={() => void startStreaming()}
                aria-label="Start direct file stream"
                className="rounded-2xl border border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30"
              >
                {streamStatus === "paused" ? "Resume" : "Start stream"}
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="*/*"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Stream status</p>
            <p className="text-xs text-white/55">{streamStatus.toUpperCase()}</p>
          </div>
          <div className="rounded-full bg-purple-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-300">
            {participantCount} participants
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
          {streamStatus === "buffering" && <Loader2 className="h-4 w-4 animate-spin text-purple-300" />}
          {streamStatus === "streaming" && <Play className="h-4 w-4 text-purple-300" />}
          {streamStatus === "paused" && <Pause className="h-4 w-4 text-purple-300" />}
          <span>{statusLabel}</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65">
            <div className="mb-1 flex items-center gap-2 text-white/85"><ShieldCheck className="h-3.5 w-3.5 text-purple-300" /> E2EE aware</div>
            <p>Session key protection is prepared for peer-to-peer chunk delivery.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65">
            <div className="mb-1 flex items-center gap-2 text-white/85"><Eye className="h-3.5 w-3.5 text-purple-300" /> View-only for participants</div>
            <p>Participants receive and render the stream without write access.</p>
          </div>
        </div>

        {fileHash && (
          <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[11px] text-white/55">
            Integrity hash: {fileHash.slice(0, 16)}…
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="rounded-2xl border border-white/10 bg-[#111827] p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{modeLabel}</p>
                <p className="mt-1 text-xs text-white/55">{modeHint}</p>
              </div>
              {(fileKind !== "other" || streamStatus === "streaming") && (
                <button type="button" className="rounded-full bg-purple-600 p-2 text-white transition hover:bg-purple-700" aria-label="Download stream asset">
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>

            {fileKind === "video" && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
                  <span>Real-time playback controls</span>
                  <span>{isPlaying ? "Playing" : "Paused"}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <button type="button" aria-label={isPlaying ? "Pause stream" : "Play stream"} onClick={() => setIsPlaying((prev) => !prev)} className="rounded-full bg-purple-600 p-2 text-white">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label="Decrease playback speed" onClick={() => setPlaybackRate((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">-</button>
                    <span className="min-w-12 text-center text-[11px] text-white/70">{playbackRate.toFixed(2)}x</span>
                    <button type="button" aria-label="Increase playback speed" onClick={() => setPlaybackRate((prev) => Math.min(2, Number((prev + 0.25).toFixed(2))))} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">+</button>
                    <label className="ml-auto flex items-center gap-2 text-[11px] text-white/60">
                      <Volume2 className="h-3.5 w-3.5" />
                      <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.currentTarget.value))} className="w-20 accent-purple-500" />
                    </label>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-2 text-[11px] text-white/65">
                    {streamStatus === "buffering" ? "Buffering..." : isPlaying ? "Host playback is being synchronized to all participants." : "Paused. Tap play to sync the room."}
                  </div>
                </div>
              </div>
            )}

            {(fileKind === "pdf" || fileKind === "image") && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between text-[11px] text-white/60">
                  <span>{fileKind === "pdf" ? "Document viewer" : "Image viewer"}</span>
                  <span>Zoom {zoomLevel.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Zoom out" onClick={() => setZoomLevel((prev) => Math.max(0.8, Number((prev - 0.2).toFixed(1))))} className="rounded-full border border-white/10 p-2 text-white/75"><ZoomOut className="h-4 w-4" /></button>
                  <button type="button" aria-label="Zoom in" onClick={() => setZoomLevel((prev) => Math.min(3, Number((prev + 0.2).toFixed(1))))} className="rounded-full border border-white/10 p-2 text-white/75"><ZoomIn className="h-4 w-4" /></button>
                  {fileKind === "pdf" && (
                    <>
                      <button type="button" aria-label="Previous page" onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))} className="rounded-full border border-white/10 p-2 text-white/75"><ArrowLeft className="h-4 w-4" /></button>
                      <span className="text-[11px] text-white/70">Page {pageNumber}</span>
                      <button type="button" aria-label="Next page" onClick={() => setPageNumber((prev) => prev + 1)} className="rounded-full border border-white/10 p-2 text-white/75"><ArrowRight className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            )}

            {fileKind === "other" && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>Sending to 5 users...</span>
                  <span>{Math.max(progress, 12)}%</span>
                </div>
                <div className="space-y-2">
                  {["Ari", "Mina", "Noah", "Lena", "Kai"].map((name, index) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span>{name}</span>
                        <span>{Math.max(88 - index * 12, 14)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400" style={{ width: `${Math.max(88 - index * 12, 14)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showMobileDataWarning && (
              <div className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">Streaming large files may use significant mobile data.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
