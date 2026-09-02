import { useState } from "react";
import {
  FileText,
  FileAudio,
  FileVideo,
  File,
  Download,
  Play,
} from "lucide-react";
import ImageLightbox from "./image-lightbox";
import { storageUrl } from "@/lib/api-url";

export interface AttachmentItem {
  objectPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface AttachmentDisplayProps {
  attachments: AttachmentItem[];
  isOwn: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function servingUrl(objectPath: string): string {
  return storageUrl(objectPath);
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("audio/"))
    return <FileAudio className="w-5 h-5" />;
  if (mimeType.startsWith("video/"))
    return <FileVideo className="w-5 h-5" />;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return <FileText className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

function ImageGrid({
  items,
  onClickImage,
}: {
  items: AttachmentItem[];
  onClickImage: (idx: number) => void;
}) {
  const count = items.length;
  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : "grid-cols-2";

  return (
    <div className={`grid ${gridClass} gap-1`}>
      {items.slice(0, 4).map((item, i) => {
        const isLast = i === 3 && count > 4;
        return (
          <div
            key={item.objectPath}
            className="relative overflow-hidden rounded-xl cursor-pointer group"
            style={{
              aspectRatio: count === 1 ? "16/10" : "1/1",
              maxWidth: count === 1 ? "280px" : undefined,
            }}
            onClick={() => onClickImage(i)}
          >
            <img
              src={servingUrl(item.objectPath)}
              alt={item.fileName}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              draggable={false}
            />
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  +{count - 4}
                </span>
              </div>
            )}
            {!isLast && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1.5">
                  <Play className="w-4 h-4 text-white fill-white" style={{ display: "none" }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VideoAttachment({ item }: { item: AttachmentItem }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ maxWidth: "280px" }}>
      <video
        src={servingUrl(item.objectPath)}
        controls
        preload="metadata"
        className="w-full rounded-xl"
        style={{ maxHeight: "200px", background: "#000" }}
      />
      <div className="flex items-center gap-2 mt-1 px-0.5">
        <span
          className="text-[11px] truncate"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {item.fileName}
        </span>
        <span
          className="text-[10px] shrink-0"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {formatSize(item.fileSize)}
        </span>
      </div>
    </div>
  );
}

function AudioAttachment({ item }: { item: AttachmentItem }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        minWidth: "220px",
        maxWidth: "280px",
      }}
    >
      <div className="flex items-center gap-2">
        <FileAudio className="w-4 h-4 shrink-0" style={{ color: "#8B5CF6" }} />
        <span
          className="text-[12px] truncate"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {item.fileName}
        </span>
        <span
          className="text-[10px] shrink-0"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {formatSize(item.fileSize)}
        </span>
      </div>
      <audio
        src={servingUrl(item.objectPath)}
        controls
        preload="metadata"
        className="w-full"
        style={{ height: "32px" }}
      />
    </div>
  );
}

function FileCard({ item }: { item: AttachmentItem }) {
  const url = servingUrl(item.objectPath);

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group transition-all hover:opacity-80"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        minWidth: "180px",
        maxWidth: "280px",
      }}
      onClick={handleDownload}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
      >
        {getFileIcon(item.mimeType)}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className="text-[13px] font-medium truncate"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          {item.fileName}
        </span>
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          {formatSize(item.fileSize)}
        </span>
      </div>
      <Download
        className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "rgba(255,255,255,0.4)" }}
      />
    </div>
  );
}

export default function AttachmentDisplay({
  attachments,
  isOwn,
}: AttachmentDisplayProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const videos = attachments.filter((a) => a.mimeType.startsWith("video/"));
  const audios = attachments.filter((a) => a.mimeType.startsWith("audio/"));
  const others = attachments.filter(
    (a) =>
      !a.mimeType.startsWith("image/") &&
      !a.mimeType.startsWith("video/") &&
      !a.mimeType.startsWith("audio/"),
  );

  const lightboxSrcs = images.map((i) => servingUrl(i.objectPath));
  const lightboxNames = images.map((i) => i.fileName);

  return (
    <>
      <div
        className={`flex flex-col gap-1.5 ${isOwn ? "items-end" : "items-start"}`}
      >
        {images.length > 0 && (
          <ImageGrid
            items={images}
            onClickImage={(idx) => setLightboxIndex(idx)}
          />
        )}
        {videos.map((v) => (
          <VideoAttachment key={v.objectPath} item={v} />
        ))}
        {audios.map((a) => (
          <AudioAttachment key={a.objectPath} item={a} />
        ))}
        {others.map((o) => (
          <FileCard key={o.objectPath} item={o} />
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxSrcs}
          fileNames={lightboxNames}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}


