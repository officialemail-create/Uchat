import { useState, useCallback } from "react";
import { apiUrl } from '@/lib/api-url';

export interface UploadedAttachment {
  objectPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadedAttachment;
  error?: string;
  previewUrl?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;

const getSessionToken = async () => {
  if (typeof window === "undefined") return null;
  const { getSupabaseAuthToken } = await import('@/lib/supabase');
  return getSupabaseAuthToken();
};

export function useFileUpload() {
  const [uploads, setUploads] = useState<FileUploadItem[]>([]);

  const startUpload = useCallback(async (item: FileUploadItem) => {
    const { file, id } = item;

    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "uploading" } : u)),
    );

    try {
      const token = await getSessionToken();
      const formData = new FormData();
      formData.append("file", file, file.name);

      const res = await fetch(apiUrl("/uploads"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text);
      } catch {
        // ignore invalid JSON response
      }

      if (!res.ok) throw new Error((json.error as string) ?? "Upload failed");

      const upload = (json.file as {
        storedName?: string;
        url?: string;
        fileName?: string;
        size?: number;
        mimeType?: string;
      } | undefined) ?? {};
      const objectPath = upload.storedName ? `uploads/${upload.storedName}` : (upload.url ? upload.url.replace("/api/storage/", "") : "");

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                status: "done",
                progress: 100,
                result: {
                  objectPath,
                  fileName: upload.fileName ?? file.name,
                  fileSize: upload.size ?? file.size,
                  mimeType: upload.mimeType ?? (file.type || "application/octet-stream"),
                },
              }
            : u,
        ),
      );
    } catch (err) {
      let errorMessage = "Upload failed";
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("fetch")) {
          errorMessage = "Unable to connect. Please check your internet connection.";
        } else {
          errorMessage = err.message;
        }
      }
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                status: "error",
                error: errorMessage,
              }
            : u,
        ),
      );
    }
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const allowed = files
        .slice(0, Math.max(0, MAX_FILES - uploads.length))
        .filter((f) => f.size <= MAX_FILE_SIZE);

      const newItems: FileUploadItem[] = allowed.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setUploads((prev) => [...prev, ...newItems]);

      newItems.forEach((item) => startUpload(item));
    },
    [uploads.length, startUpload],
  );

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  }, []);

  const clearUploads = useCallback(() => {
    setUploads((prev) => {
      prev.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
      return [];
    });
  }, []);

  const hasUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending",
  );
  const readyAttachments = uploads
    .filter((u) => u.status === "done" && u.result)
    .map((u) => u.result!);

  return {
    uploads,
    addFiles,
    removeUpload,
    clearUploads,
    hasUploading,
    readyAttachments,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
  };
}
