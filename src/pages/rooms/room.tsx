import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useSettingsStore } from "@/store/settingsStore";
import LiveSharePanel, { type LiveShareSession } from "@/components/live-share-panel";
import { LiveShareTrigger } from "@/components/live-share-trigger";
import { LiveViewerOverlay } from "@/components/live-viewer-overlay";
import { LiveReactions } from "@/components/live-reactions";
import { SessionManager } from "@/components/session-manager";
import { ErrorHandling } from "@/components/error-handling";
import { BrowserShareFlow } from "@/components/browser-share-flow";
import RoomSettingsPanel from "@/components/room-settings-panel";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRoomsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  Circle,
  FileText,
  FileText as FileTextIcon,
  FileVideo,
  Globe2,
  Hash,
  Image,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Menu,
  Mic,
  Paperclip,
  PenTool,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import EmojiPicker from "@/components/emoji-picker";

export type RoomDetail = {
  id: string;
  name: string;
  description?: string;
  privacy: "public" | "private";
  ownerId: string;
  roomCode?: string;
  createdAt?: string;
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  members?: Array<{ id: string; username: string; displayName: string; role?: string }>;
};

type RoomMessage = {
  id: string;
  roomId: string;
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: Array<{ objectPath: string; fileName: string; fileSize: number; mimeType: string }>;
};

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("uchat_session_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "include",
      headers,
      ...options,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Failed to fetch") || message.includes("fetch")) {
      throw new Error("Unable to connect. Please check your internet connection.");
    }
    throw new Error(message);
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error((json.error as string) ?? "Something went wrong. Please try again.");
  }

  return json as T;
}

async function uploadFiles(files: File[]) {
  const attachments: Array<{ objectPath: string; fileName: string; fileSize: number; mimeType: string }> = [];
  const token = typeof window !== "undefined" ? window.localStorage.getItem("uchat_session_token") : null;

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file, file.name);

    let uploadRes: Response;
    try {
      uploadRes = await fetch("/api/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("Failed to fetch") || message.includes("fetch")) {
        throw new Error("Unable to connect. Please check your internet connection.");
      }
      throw new Error(message);
    }

    const text = await uploadRes.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!uploadRes.ok) {
      throw new Error((json.error as string) ?? "Upload failed");
    }

    const upload = (json.file as {
      storedName?: string;
      url?: string;
      fileName?: string;
      size?: number;
      mimeType?: string;
    } | undefined) ?? {};
    const objectPath = upload.storedName ? `uploads/${upload.storedName}` : (upload.url ? upload.url.replace("/api/storage/", "") : "");

    attachments.push({
      objectPath,
      fileName: upload.fileName ?? file.name,
      fileSize: upload.size ?? file.size,
      mimeType: upload.mimeType ?? (file.type || "application/octet-stream"),
    });
  }

  return attachments;
}

const MessageBubble = memo(function MessageBubble({ message, isMine, currentUserName }: { message: RoomMessage; isMine: boolean; currentUserName?: string }) {
  const attachments = message.attachments ?? [];
  const timeLabel = useMemo(() => new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), [message.timestamp]);

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-0 py-0 md:max-w-[65%] ${isMine ? "rounded-br-none bg-primary text-primary-foreground shadow-sm border border-border" : "rounded-bl-none bg-surface text-foreground shadow-sm border border-border"}`}>
        <div className="p-3">
          {!isMine && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              {message.senderName || currentUserName || "You"}
            </p>
          )}

          {attachments.length > 0 && (
            <div className="mb-2 space-y-2">
              {attachments.map((attachment) => {
                const mime = attachment.mimeType || "";
                if (mime.startsWith("image/")) {
                  return (
                    <div key={attachment.objectPath} className="overflow-hidden rounded-xl border border-border bg-surface">
                      <img src={`/api/storage/${attachment.objectPath}`} alt={attachment.fileName} className="max-h-64 w-full object-cover" />
                    </div>
                  );
                }

                if (mime.startsWith("video/")) {
                  return (
                    <div key={attachment.objectPath} className="overflow-hidden rounded-xl border border-border bg-surface">
                      <video src={`/api/storage/${attachment.objectPath}`} controls className="max-h-64 w-full" />
                    </div>
                  );
                }

                return (
                  <div key={attachment.objectPath} className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm text-muted">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate">{attachment.fileName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {message.message ? <p className="break-words text-sm leading-relaxed text-foreground">{message.message}</p> : null}
          <p className="mt-2 text-[10px] text-muted">{timeLabel}</p>
        </div>
      </div>
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-none bg-background/80 p-3 border border-border">
        <div className="flex items-center space-x-1">
          {[
            "[animation-delay:0ms]",
            "[animation-delay:120ms]",
            "[animation-delay:240ms]",
          ].map((delayClass, index) => (
            <span key={index} className={`h-2 w-2 animate-bounce rounded-full bg-muted ${delayClass}`} />
          ))}
        </div>
      </div>
    </div>
  );
});

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { themeMode } = useSettingsStore();
  const { toast } = useToast();
  const roomId = params?.roomId;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liveShareOpen, setLiveShareOpen] = useState(false);
  const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);
  const [showLiveViewer, setShowLiveViewer] = useState(false);
  const [viewerContentType, setViewerContentType] = useState<"url" | "upload" | "whiteboard">("url");
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [liveShareSession, setLiveShareSession] = useState<LiveShareSession | null>(null);
  const [liveShareJoined, setLiveShareJoined] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "active" | "ended">("idle");
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts] = useState(3);
  const [networkInterrupted, setNetworkInterrupted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [streamUnavailable, setStreamUnavailable] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [browserShareOpen, setBrowserShareOpen] = useState(false);
  const [browserShareSupported, setBrowserShareSupported] = useState(false);
  const [shareMode, setShareMode] = useState<"browser" | "upload" | "whiteboard">("browser");
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "files" | "media">("details");
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const isDark = themeMode === "dark";
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const roomLabel = useMemo(() => (room?.privacy === "private" ? "Private room" : "Public room"), [room?.privacy]);
  const roomFiles = useMemo(() => messages.flatMap((message) => message.attachments ?? []), [messages]);
  const hasMedia = useMemo(() => roomFiles.some((attachment) => (attachment.mimeType || "").startsWith("image/") || (attachment.mimeType || "").startsWith("video/")), [roomFiles]);
  const messageCount = messages.length;

  const loadRoom = async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const [roomData, messageData] = await Promise.all([
        requestJson<RoomDetail>(`/rooms/${roomId}`),
        requestJson<{ messages: RoomMessage[] }>(`/rooms/${roomId}/messages`),
      ]);

      setRoom(roomData);
      setDraftName(roomData.name);
      setDraftDescription(roomData.description ?? "");
      setMessages(messageData.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const fetchLiveShare = async () => {
      try {
        const data = await requestJson<{ session: LiveShareSession | null }>(`/rooms/${roomId}/live-share`);
        setLiveShareSession(data.session);
      } catch {
        setLiveShareSession(null);
      }
    };
    fetchLiveShare();
  }, [roomId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [messageText]);

  useEffect(() => {
    setBrowserShareSupported(Boolean(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia));
  }, []);

  useEffect(() => {
    if (!showLiveViewer && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setLiveStream(null);
    }
  }, [showLiveViewer]);

  const handleSend = async () => {
    if (!roomId || !room?.isMember) return;
    const trimmed = messageText.trim();
    if (!trimmed && !fileInputRef.current?.files?.length) return;

    setSending(true);
    setError(null);
    try {
      const files = Array.from(fileInputRef.current?.files ?? []);
      const attachments = files.length ? await uploadFiles(files) : [];
      const payload = await requestJson<{ message: RoomMessage }>(`/rooms/${roomId}/message`, {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          attachments,
          senderName: user?.username || "You",
        }),
      });

      setMessages((prev) => [...prev, payload.message]);
      setMessageText("");
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!roomId || !room?.isOwner) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await requestJson<RoomDetail>(`/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draftName.trim(),
          description: draftDescription.trim(),
          privacy: room.privacy,
        }),
      });
      setRoom(updated);
      setDraftName(updated.name);
      setDraftDescription(updated.description ?? "");
      queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update room");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!roomId || !room?.isOwner) return;
    const nextPrivacy = room.privacy === "public" ? "private" : "public";
    try {
      const updated = await requestJson<RoomDetail>(`/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ privacy: nextPrivacy }),
      });
      setRoom(updated);
      queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update room privacy");
    }
  };

  const handleGenerateCode = async () => {
    if (!roomId || !room?.isOwner) return;
    try {
      const data = await requestJson<{ roomCode: string }>(`/rooms/${roomId}/generate-code`, { method: "POST" });
      setRoom((prev) => (prev ? { ...prev, roomCode: data.roomCode } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate room code");
    }
  };

  const handleInvite = async () => {
    if (!roomId) return;
    try {
      const data = await requestJson<{ inviteLink: string }>(`/rooms/${roomId}/invite`, { method: "POST" });
      setInviteLink(data.inviteLink);
      await navigator.clipboard.writeText(data.inviteLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate invite link");
    }
  };

  const handleLeave = async () => {
    if (!roomId) return;
    try {
      await requestJson<{ message: string }>(`/rooms/${roomId}/leave`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
      setLocation("/rooms/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to leave room");
    }
  };

  const handleDelete = async () => {
    if (!roomId) return;
    try {
      await requestJson<{ message: string }>(`/rooms/${roomId}/delete`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
      setLocation("/rooms/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete room");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!roomId) return;
    try {
      await requestJson<{ message: string }>(`/rooms/${roomId}/members/remove`, {
        method: "POST",
        body: JSON.stringify({ memberId }),
      });
      setRoom((prev) => prev ? { ...prev, memberCount: Math.max(prev.memberCount - 1, 0) } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member");
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const finalizeLiveSession = (nextStatus: "idle" | "active" | "ended") => {
    setSessionStatus(nextStatus);
    setHostDisconnected(false);
    setReconnectAttempts(0);
    setNetworkInterrupted(false);
    if (nextStatus !== "active") {
      setLiveShareJoined(false);
    }
  };

  const handleBrowserShareLaunch = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (popup) {
      popup.document.write(`<html><body><p>Open your target tab or video page here, then return to Uchat and press “I’m ready. Start Sharing”.</p></body></html>`);
      popup.document.close();
    }
    setBrowserShareOpen(true);
  };

  const handleBrowserShareStart = async (url?: string) => {
    if (!browserShareSupported) {
      throw new Error("Your browser does not support tab sharing. Please use Chrome, Edge, or Firefox.");
    }
    if (isMobile) {
      throw new Error("Browser sharing is only available on Desktop. Use Upload Video or Whiteboard on mobile.");
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Your browser does not support tab sharing. Please use Chrome, Edge, or Firefox.");
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      } as MediaStreamConstraints & { preferCurrentTab?: boolean; selfBrowserSurface?: string });

      screenStreamRef.current = stream;
      setLiveStream(stream);
      setShareMode("browser");
      setViewerContentType("url");
      setShowLiveViewer(true);
      finalizeLiveSession("active");
      setLiveShareJoined(true);
      setLiveShareOpen(false);
      setBrowserShareOpen(false);

      const trackEnded = () => {
        setHostDisconnected(true);
        finalizeLiveSession("ended");
        setShowLiveViewer(false);
        void handleLiveShareEnd();
      };

      stream.getVideoTracks()[0]?.addEventListener("ended", trackEnded);

      if (url) {
        await handleLiveShareStart({
          mode: "url",
          title: url,
          url,
        });
      } else {
        await handleLiveShareStart({
          mode: "url",
          title: "Shared browser tab",
          url: "https://example.com",
        });
      }
    } catch (err) {
      const message = err instanceof Error && err.name === "NotAllowedError"
        ? "Permission denied. Please allow screen sharing in your browser settings."
        : err instanceof Error
          ? err.message
          : "Unable to start browser sharing.";
      throw new Error(message);
    }
  };

  const publishLiveShareSignal = async (type: string, payload: Record<string, unknown>) => {
    if (!roomId) return;
    try {
      await requestJson<{ signal: { id: string } }>('/live-share/signaling', {
        method: "POST",
        body: JSON.stringify({
          roomId,
          toUserId: room?.ownerId ?? user?.id ?? "system",
          type,
          payload,
        }),
      });
    } catch (error) {
      console.warn("Unable to publish live-share signal", error);
    }
  };

  const handleLiveShareStart = async (payload: { mode: "url" | "upload" | "whiteboard"; title: string; url?: string; file?: File | null; strokes?: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; size: number }> }) => {
    if (!roomId) return;
    if (liveShareSession) {
      toast({ title: "Live Share already active", description: "A Live Share is already active. Join the existing session?" });
      return;
    }
    const body: Record<string, unknown> = {
      mode: payload.mode,
      title: payload.title,
      hostName: user?.displayName || user?.username || "You",
      contentType: payload.mode,
    };

    if (payload.mode === "url" && payload.url) {
      body.content = payload.url;
    }
    if (payload.mode === "upload" && payload.file) {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("uchat_session_token") : null;
      const formData = new FormData();
      formData.append("file", payload.file, payload.file.name);
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const uploadText = await uploadRes.text();
      let uploadData: Record<string, unknown> = {};
      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        // ignore
      }
      if (!uploadRes.ok) throw new Error((uploadData.error as string) ?? "Upload failed");
      const upload = (uploadData.file as { url?: string; storedName?: string; fileName?: string; mimeType?: string } | undefined) ?? {};
      body.content = upload.url ?? `/api/storage/uploads/${upload.storedName ?? payload.file.name}`;
      body.mimeType = upload.mimeType ?? (payload.file.type || "application/octet-stream");
      body.fileName = upload.fileName ?? payload.file.name;
    }
    if (payload.mode === "whiteboard" && payload.strokes) {
      body.content = JSON.stringify(payload.strokes);
    }

    const session = await requestJson<{ session: LiveShareSession }>(`/rooms/${roomId}/live-share`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setLiveShareSession(session.session);
    void publishLiveShareSignal("session-started", {
      sessionId: session.session.id,
      title: session.session.title,
      contentType: session.session.contentType,
    });
    setLiveShareJoined(true);
    finalizeLiveSession("active");
    setShowLiveViewer(true);
  };

  const handleLiveShareUpdate = async (patch: { status?: LiveShareSession["status"]; title?: string; content?: string; contentType?: LiveShareSession["contentType"]; mimeType?: string; fileName?: string }) => {
    if (!roomId) return;
    const session = await requestJson<{ session: LiveShareSession }>(`/rooms/${roomId}/live-share`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setLiveShareSession(session.session);
  };

  const handleLiveShareJoin = async () => {
    if (!roomId) return;
    const session = await requestJson<{ session: LiveShareSession }>(`/rooms/${roomId}/live-share/join`, { method: "POST", body: JSON.stringify({ name: user?.displayName || user?.username || "You" }) });
    setLiveShareSession(session.session);
    void publishLiveShareSignal("session-joined", {
      sessionId: session.session.id,
      userId: user?.id ?? "guest",
      name: user?.displayName || user?.username || "You",
    });
    setLiveShareJoined(true);
    finalizeLiveSession("active");
    toast({ title: "User joined session", description: `${user?.displayName || user?.username || "You"} joined the Live Share session.` });
    setShowLiveViewer(true);
  };

  const handleLiveShareLeave = async () => {
    if (!roomId) return;
    const session = await requestJson<{ session: LiveShareSession }>(`/rooms/${roomId}/live-share/leave`, { method: "POST" });
    setLiveShareSession(session.session);
    setLiveShareJoined(false);
    setShowLiveViewer(false);
    finalizeLiveSession("idle");
  };

  const handleLiveShareEnd = async () => {
    if (!roomId) return;
    const session = await requestJson<{ session: LiveShareSession | null }>(`/rooms/${roomId}/live-share/end`, { method: "POST" });
    setLiveShareSession(session.session);
    setLiveShareJoined(false);
    finalizeLiveSession("ended");
    setShowLiveViewer(false);
  };

  const handleLiveShareReact = async (emoji: string) => {
    if (!roomId) return;
    const session = await requestJson<{ session: LiveShareSession }>(`/rooms/${roomId}/live-share/react`, {
      method: "POST",
      body: JSON.stringify({ emoji, userName: user?.displayName || user?.username || "You" }),
    });
    setLiveShareSession(session.session);
  };

  const handleReconnect = () => {
    const nextAttempts = reconnectAttempts + 1;
    if (nextAttempts >= maxReconnectAttempts) {
      setHostDisconnected(false);
      setNetworkInterrupted(false);
      setSessionStatus("ended");
      return;
    }

    setReconnectAttempts(nextAttempts);
    setHostDisconnected(true);
    setNetworkInterrupted(true);
    window.setTimeout(() => {
      setNetworkInterrupted(false);
      if (nextAttempts + 1 >= maxReconnectAttempts) {
        setHostDisconnected(false);
        setSessionStatus("ended");
      }
    }, 900);
  };

  const handleToggleRecording = () => {
    setIsRecording((prev) => !prev);
    setIsTyping((prev) => !prev);
  };

  return (
    <AppLayout>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-64 flex-col border-r border-border bg-surface transition-all md:flex">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{room?.name ?? "Room"}</p>
                  <p className="text-xs text-muted">{roomLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Members</p>
                <span className="text-xs text-muted">{room?.memberCount ?? 0}</span>
              </div>
              <div className="space-y-2">
                {room?.members?.map((member) => {
                  const initials = member.displayName?.split(" ").slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "U";
                  return (
                    <div key={member.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface/80">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
                        <p className="truncate text-xs text-muted">@{member.username}</p>
                      </div>
                      <div className="relative">
                        <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                        <span className="pointer-events-none invisible absolute right-0 top-4 z-10 rounded-md bg-surface px-2 py-1 text-[11px] text-foreground group-hover:visible">{member.displayName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Open room settings"
                  onClick={() => setRoomSettingsOpen(true)}
                  className="flex flex-1 items-center justify-center rounded-lg border border-border p-2 text-muted transition hover:bg-background hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Leave room"
                  onClick={handleLeave}
                  className="flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col bg-background">
            <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open room menu"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-foreground md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{room?.name ?? "Room"}</h2>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-950/30 px-2 py-1 text-[11px] font-medium text-emerald-300">
                      <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                      Online
                    </div>
                  </div>
                  <p className="text-sm text-muted">{room?.description || "Global chat."}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LiveShareTrigger onOpen={() => setIsLivePanelOpen(true)} activeSession={Boolean(liveShareSession)} />
                <button
                  type="button"
                  aria-label="Search room"
                  className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-foreground"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col bg-background">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {loading ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/80">
                    <div className="flex flex-col items-center gap-3 text-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Loading room...</p>
                    </div>
                  </div>
                ) : !room ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center text-muted">
                    {error ?? "Room not found"}
                  </div>
                ) : messageCount === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/80 text-center text-muted">
                    <div className="max-w-sm space-y-2">
                      <p className="text-lg font-semibold text-foreground">Start the conversation</p>
                      <p className="text-sm">No messages yet. Share a thought and kick things off.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {isTyping ? <TypingIndicator /> : null}
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} isMine={message.senderName === (user?.username || "You")} currentUserName={user?.displayName || user?.username || "You"} />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-surface p-3 md:p-4">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
                  <div className="relative flex items-end gap-2 md:gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Attach file"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full p-2 text-muted transition hover:bg-background/70 hover:text-primary"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Add image"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full p-2 text-muted transition hover:bg-background/70 hover:text-primary"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Start voice note"
                        onClick={handleToggleRecording}
                        className={`rounded-full p-2 transition ${isRecording ? "animate-pulse bg-primary/15 text-primary ring-2 ring-primary/50" : "text-muted hover:bg-background/70 hover:text-primary"}`}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Open emoji picker"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                          className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-foreground"
                        >
                          <Smile className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {showEmojiPicker ? (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              className="absolute bottom-12 left-0 z-20 w-[280px] rounded-2xl border border-border bg-surface p-2 shadow-xl"
                            >
                              <EmojiPicker onSelect={insertEmoji} />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="Write a message"
                      rows={1}
                      className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background/95 px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    <button
                      type="button"
                      aria-label="Send message"
                      disabled={sending || (!messageText.trim() && !fileInputRef.current?.files?.length)}
                      onClick={() => void handleSend()}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-background/70"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={() => undefined} />
                  {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                </div>
              </div>
            </div>
          </main>

          <aside className="hidden w-72 flex-col border-l border-border bg-surface lg:flex">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Room details</p>
                  <p className="text-xs text-muted">Share, manage and inspect</p>
                </div>
              </div>
            </div>
            <div className="flex border-b border-border">
              {(["details", "files", "media"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveDetailTab(tab)}
                  className={`flex-1 px-3 py-2 text-sm font-medium capitalize transition ${activeDetailTab === tab ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activeDetailTab === "details" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-background/80 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Privacy</span>
                      <span className="font-semibold text-foreground">{room?.privacy === "private" ? "Private" : "Public"}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Created</span>
                      <span className="font-semibold text-foreground">{room?.createdAt ? new Date(room.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Owner</span>
                      <span className="font-semibold text-foreground">{room?.members?.find((member) => member.id === room.ownerId)?.displayName || "You"}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "files" && (
                <div className="space-y-2">
                  {roomFiles.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">No files shared yet.</p>
                  ) : (
                    roomFiles.map((attachment) => (
                      <div key={attachment.objectPath} className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-3 py-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{attachment.fileName}</p>
                          <p className="text-xs text-muted">{attachment.mimeType || "File"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDetailTab === "media" && (
                <div className="space-y-2">
                  {!hasMedia ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">No media shared yet.</p>
                  ) : (
                    roomFiles.filter((attachment) => (attachment.mimeType || "").startsWith("image/") || (attachment.mimeType || "").startsWith("video/")).map((attachment) => (
                      <div key={attachment.objectPath} className="overflow-hidden rounded-2xl border border-border bg-background/80">
                        {attachment.mimeType?.startsWith("video/") ? (
                          <video src={`/api/storage/${attachment.objectPath}`} controls className="h-32 w-full object-cover" />
                        ) : (
                          <img src={`/api/storage/${attachment.objectPath}`} alt={attachment.fileName} className="h-32 w-full object-cover" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <AnimatePresence>
          {mobileSidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="h-full w-64 border-r border-border bg-surface"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border p-4">
                  <p className="text-sm font-semibold text-foreground">Room menu</p>
                  <button type="button" aria-label="Close room menu" onClick={() => setMobileSidebarOpen(false)} className="rounded-full p-2 text-muted hover:bg-background/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <button type="button" aria-label="Open room settings" onClick={() => { setRoomSettingsOpen(true); setMobileSidebarOpen(false); }} className="mb-3 flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-background/70">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </button>
                  <button type="button" aria-label="Leave room" onClick={handleLeave} className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
                    Leave Room
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <RoomSettingsPanel
        open={roomSettingsOpen}
        onClose={() => setRoomSettingsOpen(false)}
        room={room}
        draftName={draftName}
        draftDescription={draftDescription}
        setDraftName={setDraftName}
        setDraftDescription={setDraftDescription}
        isSaving={isSaving}
        inviteLink={inviteLink}
        roomCode={room?.roomCode}
        onSaveDetails={handleSaveDetails}
        onTogglePrivacy={handleTogglePrivacy}
        onGenerateCode={handleGenerateCode}
        onInvite={handleInvite}
        onLeave={handleLeave}
        onDelete={handleDelete}
        onRemoveMember={handleRemoveMember}
        currentUserId={user?.id}
      />
      <BrowserShareFlow
        open={browserShareOpen}
        isMobile={isMobile}
        isSupported={browserShareSupported}
        onClose={() => setBrowserShareOpen(false)}
        onLaunchTab={handleBrowserShareLaunch}
        onStartShare={handleBrowserShareStart}
      />

      <LiveViewerOverlay
        open={showLiveViewer}
        isHost={Boolean(liveShareSession && liveShareSession.hostId === user?.id)}
        sessionTitle={liveShareSession?.title || "Live Share"}
        contentType={shareMode === "browser" ? "url" : viewerContentType}
        stream={liveStream}
        initialWhiteboardContent={liveShareSession?.content ?? null}
        isLoading={false}
        error={null}
        onExit={() => {
          setShowLiveViewer(false);
          finalizeLiveSession("idle");
        }}
        onStop={() => {
          void handleLiveShareEnd();
          setShowLiveViewer(false);
        }}
        onRetry={() => {
          setShowLiveViewer(true);
          setNetworkInterrupted(false);
        }}
        onOpenInNewWindow={() => {
          window.open(window.location.href, "_blank", "popup,width=1200,height=800");
        }}
        onSwitchTab={handleBrowserShareLaunch}
        onReaction={() => handleLiveShareReact("❤️")}
        onWhiteboardContentChange={(content) => {
          if (liveShareSession?.contentType === "whiteboard") {
            void handleLiveShareUpdate({ content, contentType: "whiteboard" });
          }
        }}
        canReact={!Boolean(liveShareSession && liveShareSession.hostId === user?.id)}
      />

      <LiveReactions
        visible={showLiveViewer}
        isParticipant={Boolean(liveShareSession && liveShareSession.hostId !== user?.id)}
        onReact={handleLiveShareReact}
        onClose={() => undefined}
      />

      <SessionManager
        sessionStatus={sessionStatus}
        onReconnect={handleReconnect}
        reconnectAttempts={reconnectAttempts}
        maxReconnectAttempts={maxReconnectAttempts}
        hostDisconnected={hostDisconnected}
        joined={liveShareJoined}
      />

      <ErrorHandling
        networkInterrupted={networkInterrupted}
        permissionDenied={permissionDenied}
        streamUnavailable={streamUnavailable}
        uploadFailed={uploadFailed}
        onRetry={() => {
          setStreamUnavailable(false);
          setPermissionDenied(false);
          setNetworkInterrupted(false);
        }}
        onClose={() => {
          setPermissionDenied(false);
          setStreamUnavailable(false);
        }}
      />

      <AnimatePresence>
        {isLivePanelOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/35 backdrop-blur-[2px]"
            onClick={() => setIsLivePanelOpen(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="fixed inset-y-0 right-0 z-[161] flex w-full flex-col bg-surface shadow-2xl sm:w-96"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Start live share"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Live Share</p>
                  <h3 className="text-lg font-semibold text-foreground">Start Live Share</h3>
                </div>
                <button type="button" aria-label="Close live share panel" onClick={() => setIsLivePanelOpen(false)} className="rounded-full p-2 text-muted transition hover:bg-background/70 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {liveShareSession ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                    <p className="font-semibold">A Live Share is already active.</p>
                    <p className="mt-1 text-sm opacity-90">Join the current session from the existing live view or end it to start a new one.</p>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition hover:bg-surface" onClick={() => {
                    if (isMobile) {
                      toast({ title: "Browser sharing unavailable", description: "Browser sharing is only available on Desktop. Use Upload Video or Whiteboard on mobile." });
                      return;
                    }
                    handleBrowserShareLaunch();
                  }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Open URL & Share Browser</p>
                      <p className="text-sm text-muted">Open a new tab, then share the page content with the room.</p>
                    </div>
                  </button>

                  <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition hover:bg-surface" onClick={() => {
                    setViewerContentType("upload");
                    setShowLiveViewer(true);
                    setIsLivePanelOpen(false);
                  }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <FileVideo className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Upload Video</p>
                      <p className="text-sm text-muted">Share a video file with everyone in the room.</p>
                    </div>
                  </button>

                  <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition hover:bg-surface" onClick={() => {
                    setViewerContentType("upload");
                    setShowLiveViewer(true);
                    setIsLivePanelOpen(false);
                  }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Image className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Upload Image or PDF</p>
                      <p className="text-sm text-muted">Share a document or image directly to the room.</p>
                    </div>
                  </button>

                  <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/80 p-4 text-left shadow-sm transition hover:bg-surface" onClick={() => {
                    setViewerContentType("whiteboard");
                    setShowLiveViewer(true);
                    setIsLivePanelOpen(false);
                  }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <PenTool className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Whiteboard</p>
                      <p className="text-sm text-muted">Sketch ideas together in real time.</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="border-t border-border p-4">
                <div className="rounded-2xl border border-border bg-background/80 p-3 text-sm text-muted">
                  <p className="font-medium text-foreground">Tip</p>
                  <p className="mt-1">Swipe from the right edge on mobile or tap the floating Live button to reopen this panel.</p>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <LiveSharePanel
        open={liveShareOpen}
        onClose={() => setLiveShareOpen(false)}
        roomId={roomId ?? ""}
        currentUserId={user?.id ?? ""}
        currentUserName={user?.displayName || user?.username || "You"}
        session={liveShareSession}
        isHost={!!liveShareSession && liveShareSession.hostId === user?.id}
        isJoined={liveShareJoined || !!(liveShareSession && liveShareSession.participants.some((participant) => participant.id === user?.id))}
        onStart={handleLiveShareStart}
        onUpdate={handleLiveShareUpdate}
        onJoin={handleLiveShareJoin}
        onLeave={handleLiveShareLeave}
        onEnd={handleLiveShareEnd}
        onReact={handleLiveShareReact}
      />
    </AppLayout>
  );
}
