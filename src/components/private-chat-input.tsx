import { Mic, Plus, Send, Smile, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import VoiceRecorder from "@/components/voice-recorder2";

const EmojiPicker = lazy(() => import("@/components/emoji-picker").then((module) => ({ default: module.default })));

const QUICK_EMOJIS = ["😀", "👍", "❤️", "🔥", "🎉", "✨", "😂", "🙏"];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  replyingTo?: { content: string } | null;
  onCancelReply?: () => void;
  onUpload?: (file: File) => void;
  onCameraUpload?: (file: File) => void;
  onVoiceSend?: (audioDataUrl: string, durationMs: number) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, replyingTo, onCancelReply, onUpload, onCameraUpload, onVoiceSend, isEditing, onCancelEdit, disabled = false }: ChatInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const [mediaKind, setMediaKind] = useState<"camera" | "gallery" | "voice">("gallery");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const voiceRecordingSupported = typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [inputValue]);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? inputValue.length;
    const end = textarea?.selectionEnd ?? inputValue.length;
    const nextValue = `${inputValue.slice(0, start)}${emoji}${inputValue.slice(end)}`;

    setInputValue(nextValue);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea?.focus();
      const caretPosition = start + emoji.length;
      if (textarea) {
        textarea.selectionStart = caretPosition;
        textarea.selectionEnd = caretPosition;
      }
    });

    setShowEmojiPicker(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        setInputValue("");
        onChange("");
      }
    }
  };

  const handleUploadFailure = () => {
    toast({ title: "Upload failed", description: "No file was selected. Try again." });
  };

  const openMediaMenu = (kind: "camera" | "gallery" | "voice") => {
    setMediaKind(kind);
    setMediaMenuOpen(false);

    if (kind === "voice") {
      setShowVoiceRecorder(true);
      return;
    }

    const input = fileInputRef.current;
    if (!input) return;

    input.value = "";
    input.accept = kind === "camera" ? "image/*" : "image/*,video/*";
    input.multiple = kind === "gallery";

    if (kind === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }

    input.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      handleUploadFailure();
      return;
    }

    if (mediaKind === "camera") {
      const [file] = Array.from(files);
      onCameraUpload?.(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    Array.from(files).forEach((file) => onUpload?.(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVoiceSend = (audioDataUrl: string, durationMs: number) => {
    onVoiceSend?.(audioDataUrl, durationMs);
    setShowVoiceRecorder(false);
  };

  const handleSendClick = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInputValue("");
    onChange("");
  };

  const isTyping = inputValue.trim().length > 0;

  return (
    <div className="relative z-20 border-t border-gray-800 bg-[#121212] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 sm:px-3 sm:pb-3">
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload media file"
        className="absolute left-[-9999px] h-px w-px overflow-hidden opacity-0"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {replyingTo ? (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-gray-700 bg-[#1b1b1b] px-3 py-2 text-sm text-gray-300">
          <span className="truncate">Replying to: {replyingTo.content}</span>
          <button type="button" onClick={onCancelReply} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {isEditing ? (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <span className="truncate font-medium">Editing message</span>
          <button type="button" onClick={onCancelEdit} className="rounded-full p-1 text-amber-200 transition hover:bg-amber-500/20 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="relative flex items-end gap-2 sm:gap-2.5">
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="relative">
            <button
              type="button"
              aria-label="Add media"
              onClick={() => setMediaMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition hover:bg-purple-200 active:scale-95 sm:h-10 sm:w-10 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/40"
            >
              <Plus className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>

            {mediaMenuOpen ? (
              <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-[220px] overflow-hidden rounded-[20px] border border-gray-700 bg-[#1a1a1a]/95 p-2 shadow-[0_18px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMediaMenu("camera");
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-gray-100 transition hover:bg-gray-800"
                >
                  <span>Take Photo</span>
                  <span className="text-xs text-purple-400">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMediaMenu("gallery");
                  }}
                  className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-gray-100 transition hover:bg-gray-800"
                >
                  <span>Choose from Gallery</span>
                  <span className="text-xs text-purple-400">Files</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openMediaMenu("voice");
                  }}
                  className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-gray-100 transition hover:bg-gray-800"
                >
                  <span>Record Voice</span>
                  <span className="text-xs text-purple-400">Mic</span>
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Add emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition hover:bg-gray-800 hover:text-purple-300 sm:h-9 sm:w-9"
          >
            <Smile className="h-4 w-4 sm:h-4 sm:w-4" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            onChange(nextValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          className="min-w-0 flex-1 min-h-[40px] max-h-32 resize-none overflow-hidden rounded-[22px] border border-gray-700 bg-[#1e1e1e] px-3 py-2 text-[16px] text-white placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 sm:min-h-[44px] sm:text-sm"
          aria-label="Type a private message"
          disabled={disabled}
        />

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {isTyping ? (
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSendClick}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm transition-all duration-200 hover:bg-purple-400 active:scale-95 sm:h-10 sm:w-10"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Start voice note"
              title={voiceRecordingSupported ? "Record voice note" : "Voice recording is not supported on this device"}
              disabled={disabled || !voiceRecordingSupported}
              onClick={() => setShowVoiceRecorder((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition hover:bg-purple-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/40 sm:h-10 sm:w-10"
            >
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        {showEmojiPicker ? (
          <div className="fixed bottom-[76px] left-1/2 z-[60] w-[min(92vw,300px)] -translate-x-1/2 overflow-hidden rounded-[24px] border border-gray-700 bg-[#1a1a1a]/95 shadow-[0_18px_30px_rgba(0,0,0,0.38)] backdrop-blur-sm">
            <div className="flex flex-wrap gap-2 p-3">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#262626] text-xl transition hover:bg-[#2d2d2d]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Suspense fallback={<div className="px-3 pb-3 text-sm text-gray-400">Loading more emojis…</div>}>
              <EmojiPicker onSelect={insertEmoji} />
            </Suspense>
          </div>
        ) : null}

        {showVoiceRecorder ? (
          <div className="fixed inset-x-2 bottom-[76px] z-[60] max-h-[calc(100dvh-96px)] overflow-y-auto rounded-2xl border border-gray-700 bg-[#1e1e1e] shadow-xl sm:absolute sm:inset-x-auto sm:bottom-full sm:right-0 sm:mb-2 sm:max-h-none sm:min-w-[280px]">
            <VoiceRecorder
              onSend={handleVoiceSend}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
