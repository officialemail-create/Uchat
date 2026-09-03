import { useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { socketService } from "@/services/socket";
import { Send, X, CornerUpLeft, Edit2, Smile, Paperclip, Mic, AlertCircle, ImageIcon, FileText, FileAudio, FileVideo, File } from "lucide-react";
import type { Message } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "./emoji-picker";
import VoiceRecorder, { VoiceRecorderHandle } from "./voice-recorder2";
import UploadModal from "./upload-modal";
import { useFileUpload } from "@/hooks/use-file-upload";
import { insertEmojiAtCursor } from "@/lib/emoji-utils";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/auth";
import { queueMessage } from "@/lib/message-outbox";

interface ChatInputProps {
  replyingTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
}

const MAX_LENGTH = 2000;
const ACCENT = "#8B5CF6";
const INPUT_BG = "#0B0F19";
const FIELD_BG = "#1A1F2E";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="w-3.5 h-3.5" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-3.5 h-3.5" />;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return <FileText className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

export default function ChatInput({ replyingTo, onCancelReply, editingMessage, onCancelEdit }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { currentUsername, typingUsers, updateMessage, addPendingMessage } = useChatStore();
  const { enterToSend, showTypingIndicators } = useSettingsStore();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<VoiceRecorderHandle | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragCounterRef = useRef(0);

  const {
    uploads,
    addFiles,
    removeUpload,
    clearUploads,
    hasUploading,
    readyAttachments,
    maxFiles,
    maxFileSize,
  } = useFileUpload();

  useEffect(() => {
    if (editingMessage) { setText(editingMessage.message); textareaRef.current?.focus(); }
    else setText("");
  }, [editingMessage]);

  useEffect(() => { if (replyingTo) textareaRef.current?.focus(); }, [replyingTo]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  useEffect(() => {
    if (!isPickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-emoji-picker-root]")) return;
      setIsPickerOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPickerOpen]);

  const emitTyping = (isTyping: boolean) => {
    if (!currentUsername || !showTypingIndicators) return;
    socketService.getSocket()?.emit("typing", { username: currentUsername, isTyping });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > MAX_LENGTH) return;
    setText(e.target.value);
    if (showTypingIndicators) {
      emitTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
    }
  };

  const handleSend = () => {
    const socket = socketService.getSocket();
    const currentUserId = useAuthStore.getState().user?.id;
    if (!currentUsername || !currentUserId) return;
    if (hasUploading) return;

    if (editingMessage) {
      const clean = text.trim();
      if (!clean) return;
      if (!socket?.connected) return;
      updateMessage(editingMessage.id, clean);
      socket.emit("edit_message", { messageId: editingMessage.id, newMessage: clean });
      onCancelEdit(); setText(""); emitTyping(false);
      return;
    }

    const clean = text.trim();
    if (!clean && readyAttachments.length === 0) return;

    const pendingKey = crypto.randomUUID();
    const pendingId = `pending-${pendingKey}`;
      addPendingMessage({
      id: pendingId,
      senderName: currentUsername,
      message: clean,
      timestamp: new Date().toISOString(),
      edited: false,
      unsent: false,
      voiceNote: false,
      voiceDuration: null,
      replyTo: replyingTo?.id ?? null,
      replyToMessage: replyingTo?.message ?? null,
      replyToSender: replyingTo?.senderName ?? null,
        attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    });

    if (!socket?.connected) {
      if (readyAttachments.length > 0) {
        toast({ title: "Attachment waiting", description: "Attachments require an internet connection." });
        useChatStore.getState().deleteMessage(pendingId);
        return;
      }
      queueMessage(currentUserId, { id: pendingKey, chatId: "global", content: clean, senderId: currentUserId, senderUsername: currentUsername, senderName: currentUsername, timestamp: new Date().toISOString() });
      setText("");
      onCancelReply();
      return;
    }

    socket.emit("send_message", {
      room: "global",
      content: clean,
      clientMessageId: pendingKey,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    }, (response: { ok?: boolean; code?: string; error?: string }) => {
      if (response?.ok) return;
      useChatStore.getState().deleteMessage(pendingId);
      toast({
        title: response?.code === "USER_NOT_FOUND" ? "User not found" : "Message not sent",
        description: response?.error ?? "Please try again.",
        variant: "destructive",
      });
    });
    setText("");
    clearUploads();
    onCancelReply();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(false);
  };

  const handleVoiceSend = async (audioBlob: Blob, durationMs: number, mimeType: string) => {
    const socket = socketService.getSocket();
    if (!socket || !currentUsername) return;

    let uploaded: { audioUrl: string; mimeType: string };
    try {
      uploaded = await authApi.uploadVoiceNote(audioBlob, mimeType);
    } catch (error) {
      toast({ title: "Voice note failed", description: error instanceof Error ? error.message : "Unable to upload voice note", variant: "destructive" });
      return;
    }

    const pendingKey = crypto.randomUUID();
    const pendingId = `pending-${pendingKey}`;
    addPendingMessage({
      id: pendingId,
      senderName: currentUsername,
      message: uploaded.audioUrl,
      timestamp: new Date().toISOString(),
      edited: false,
      unsent: false,
      voiceNote: true,
      voiceDuration: durationMs,
      replyTo: replyingTo?.id ?? null,
      replyToMessage: null,
      replyToSender: null,
      attachments: undefined,
    });

    socket.emit("send_voice_note", {
      room: "global",
      audioUrl: uploaded.audioUrl,
      mimeType: uploaded.mimeType,
      size: audioBlob.size,
      duration: durationMs,
      clientMessageId: pendingKey,
    }, (response: { ok?: boolean; reason?: string; code?: string }) => {
      if (!response?.ok) {
        useChatStore.getState().deleteMessage(pendingId);
        toast({
          title: "Voice note failed",
          description: response?.reason ?? response?.code ?? "Unable to send voice note",
          variant: "destructive",
        });
      }
    });
    setShowVoiceRecorder(false);
    onCancelReply();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && enterToSend) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") { setIsPickerOpen(false); onCancelReply(); onCancelEdit(); }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const result = insertEmojiAtCursor(el, emoji, MAX_LENGTH);

    if (!result) return;

    setText(result.value);
    requestAnimationFrame(() => {
      el?.focus();
      if (el) {
        el.selectionStart = result.caret;
        el.selectionEnd = result.caret;
      }
    });
    setIsPickerOpen(false);
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.size <= maxFileSize);
    if (arr.length < files.length) {
      /* silently skip oversized */
    }
    addFiles(arr);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addFiles, maxFileSize]);

  /* drag & drop */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files) handleFileSelect(files);
  }, [handleFileSelect]);

  const otherTypingUsers = showTypingIndicators
    ? typingUsers.filter((u) => u !== currentUsername)
    : [];
  const hasText = text.trim().length > 0;
  const remaining = MAX_LENGTH - text.length;
  const showCounter = text.length > 1800;
  const canSend = (hasText || readyAttachments.length > 0) && !hasUploading;

  return (
    <div
      className="shrink-0 flex flex-col relative bg-surface border-t border-border"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl pointer-events-none"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "2px dashed rgba(124,58,237,0.35)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Paperclip className="w-8 h-8 mb-2" style={{ color: ACCENT }} />
            <p className="text-sm font-medium" style={{ color: ACCENT }}>
              Drop files to attach
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Upload modal (camera / gallery) */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onFilesSelected={(files) => {
            const arr = files.filter((f) => f.size <= maxFileSize);
            if (arr.length === 0) return;
            addFiles(arr);
            setShowUploadModal(false);
          }}
        />
      )}

      {/* Emoji picker */}
      <AnimatePresence>
        {isPickerOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsPickerOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-2 bottom-[76px] z-[60] flex justify-center"
              style={{
                background: "transparent",
                borderRadius: "12px",
                pointerEvents: "auto",
              }}
              data-emoji-picker-root
            >
              <div className="w-full max-w-[360px]">
                <EmojiPicker onSelect={insertEmoji} onClose={() => setIsPickerOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice recorder */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <VoiceRecorder
            ref={recorderRef}
            onSend={handleVoiceSend}
            onCancel={() => setShowVoiceRecorder(false)}
            onRecordingChange={(v) => setIsRecordingActive(v)}
          />
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <div className="h-5 flex items-center px-4">
        <AnimatePresence>
          {otherTypingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "rgba(161,161,170,0.5)" }}
            >
              <div className="flex gap-[3px] items-end h-3">
                {[0, 150, 300].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] h-[3px] rounded-full"
                    style={{ background: ACCENT }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                  />
                ))}
              </div>
              <span>
                {otherTypingUsers.length === 1
                  ? `${otherTypingUsers[0]} is typing`
                  : `${otherTypingUsers.length} people typing`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reply / Edit banner */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && !showVoiceRecorder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-4 py-2 mx-3 mb-1 rounded-xl"
              style={{ background: `${ACCENT}0f`, borderLeft: `3px solid ${ACCENT}` }}
            >
              <div className="flex items-center gap-2 overflow-hidden text-sm min-w-0">
                {replyingTo ? (
                  <>
                    <CornerUpLeft className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                    <span className="font-medium shrink-0 text-[13px]" style={{ color: ACCENT }}>
                      {replyingTo.senderName}
                    </span>
                    <span className="truncate text-[12px]" style={{ color: "#A1A1AA" }}>
                      {replyingTo.voiceNote ? "🎤 Voice note" : replyingTo.unsent ? "Message deleted" : replyingTo.message}
                    </span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5 shrink-0" style={{ color: ACCENT }} />
                    <span className="font-medium text-[13px]" style={{ color: ACCENT }}>Editing message</span>
                  </>
                )}
              </div>
              <button
                onClick={() => { onCancelReply(); onCancelEdit(); }}
                className="ml-2 p-1 rounded-full transition-colors shrink-0"
                style={{ color: "rgba(161,161,170,0.5)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File staging area */}
      <AnimatePresence>
        {uploads.length > 0 && !showVoiceRecorder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {uploads.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="relative shrink-0 rounded-xl overflow-hidden"
                    style={{
                      width: item.previewUrl ? 72 : 140,
                      height: 72,
                      background: "#1A1F2E",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Preview */}
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2">
                        <div style={{ color: "rgba(255,255,255,0.4)" }}>
                          <FileTypeIcon mimeType={item.file.type} />
                        </div>
                        <span
                          className="text-[10px] text-center truncate w-full"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          {item.file.name}
                        </span>
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {formatSize(item.file.size)}
                        </span>
                      </div>
                    )}

                    {/* Progress overlay */}
                    {(item.status === "uploading" || item.status === "pending") && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                      >
                        <div className="w-10 h-10 relative">
                          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                            <circle
                              cx="18" cy="18" r="15"
                              fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"
                            />
                            <circle
                              cx="18" cy="18" r="15"
                              fill="none" stroke={ACCENT} strokeWidth="3"
                              strokeDasharray={`${(item.progress / 100) * 94.25} 94.25`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dasharray 0.2s ease" }}
                            />
                          </svg>
                          <span
                            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold"
                            style={{ color: "white" }}
                          >
                            {item.progress}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error overlay */}
                    {item.status === "error" && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
                        style={{ background: "rgba(239,68,68,0.7)" }}
                      >
                        <AlertCircle className="w-5 h-5 text-white" />
                        <span className="text-[9px] text-white text-center px-1">Failed</span>
                      </div>
                    )}

                    {/* Done checkmark */}
                    {item.status === "done" && item.previewUrl && (
                      <div
                        className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: ACCENT }}
                      >
                        <span className="text-[8px] text-white font-bold">✓</span>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeUpload(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </motion.div>
                ))}

                {/* Add more */}
                {uploads.length < maxFiles && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors hover:opacity-80"
                    style={{
                      width: 72,
                      height: 72,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    <Paperclip className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Add more
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input row */}
      {!showVoiceRecorder && (
        <div className="flex items-end gap-2 px-3 pb-4 pt-1">
          <div className="flex items-end gap-0.5 mb-0.5 shrink-0">
            <button
              onClick={() => setIsPickerOpen((open) => !open)}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: isPickerOpen ? "#8b5cf6" : "rgba(255,255,255,0.35)" }}
              title="Emoji"
              aria-label="Choose emoji"
              aria-expanded={isPickerOpen}
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={uploads.length >= maxFiles}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{
                color: uploads.length > 0
                  ? ACCENT
                  : uploads.length >= maxFiles
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(255,255,255,0.35)",
              }}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Input pill */}
          <div
            className="flex-1 flex items-end overflow-hidden"
            style={{ borderRadius: "26px", background: FIELD_BG, minHeight: "42px", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "Edit message…" : uploads.length > 0 ? "Add a caption…" : "Message"}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-[14px] text-white placeholder:text-white/25 px-4 py-[10px] leading-[1.4]"
              style={{ scrollbarWidth: "none", maxHeight: "120px", overflow: "auto" }}
              data-testid="input-message"
            />
          </div>

          {/* Counter + send button */}
          <div className="flex flex-col items-center gap-1 mb-0.5 shrink-0">
            {showCounter && (
              <span
                className="text-[10px] tabular-nums"
                style={{ color: remaining <= 50 ? "#EF4444" : "#f59e0b" }}
              >
                {remaining}
              </span>
            )}
            <AnimatePresence mode="wait">
              {editingMessage || canSend ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.14, type: "spring", stiffness: 320 }}
                  onClick={handleSend}
                  disabled={hasUploading}
                  aria-busy={hasUploading}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: hasUploading ? "rgba(34,197,94,0.4)" : ACCENT,
                    boxShadow: hasUploading ? "none" : `0 0 20px ${ACCENT}40`,
                    opacity: hasUploading ? 0.7 : 1,
                  }}
                  data-testid="button-send-message"
                >
                  {hasUploading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                    />
                  ) : (
                    <Send className="w-[18px] h-[18px]" />
                  )}
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.14, type: "spring", stiffness: 320 }}
              onClick={() => {
                if (!showVoiceRecorder) {
                  setShowVoiceRecorder(true);
                  // start recording once mounted
                  setTimeout(() => recorderRef.current?.start(), 120);
                } else {
                  // if already open and recording, stop; otherwise close
                  if (recorderRef.current?.isRecording()) {
                    recorderRef.current?.stop();
                  } else {
                    setShowVoiceRecorder(false);
                  }
                }
              }}
              className="w-11 h-11 flex items-center justify-center rounded-full text-white relative"
              style={{ background: isRecordingActive ? "#ef4444" : ACCENT }}
              title="Voice note"
                >
              <Mic className="w-[18px] h-[18px]" />
              {isRecordingActive && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
              )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
