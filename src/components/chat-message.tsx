import { useState, useRef, useEffect, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, CornerUpLeft, Clock3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useChatStore, type Reaction } from "@/store/chatStore";
import { socketService } from "@/services/socket";
import type { Message } from "@workspace/api-client-react";
import MessageOptionsMenu from "./message-options-menu";
import VoicePlayer from "./voice-player";
import AttachmentDisplay from "./attachment-display";
import { LinkPreviewCard } from "./link-preview-card";
import { useLinkPreview } from "../hooks/use-link-preview";

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  isConsecutive: boolean;
  isLastInGroup: boolean;
  isUnread: boolean;
  highlight?: string;
  reactions?: Reaction[];
  onReply: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onReact?: (emoji: string) => void;
}

const AVATAR_COLORS = ["#8B5CF6","#6366f1","#8b5cf6","#ec4899","#f59e0b","#ef4444","#06b6d4","#3b82f6"];
const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","👎"];
const OWN_BG = "#2E1A4F";
const OTHER_BG = "#1A1F2E";
const ACCENT = "#8B5CF6";

function autoAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 20) return false;
  if (/[a-zA-Z0-9!@#$%^&*()_+=\-[\]{};:'",.<>?/\\|`~]/.test(t)) return false;
  return t.replace(/[^\x20-\x7E]/g, "").trim().length === 0 && Array.from(t.replace(/\s/g, "")).length <= 5;
}

interface Seg { type: "text" | "url"; content: string; }
function parseMessage(text: string): Seg[] {
  const urlRe = /https?:\/\/[^\s<>"]+/g;
  const out: Seg[] = [];
  let last = 0, m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", content: text.slice(last, m.index) });
    out.push({ type: "url", content: m[0] });
    last = urlRe.lastIndex;
  }
  if (last < text.length) out.push({ type: "text", content: text.slice(last) });
  return out;
}

function renderContent(text: string, highlight?: string): React.ReactNode {
  return parseMessage(text).map((seg, i) => {
    if (seg.type === "url") {
      return (
        <a key={i} href={seg.content} target="_blank" rel="noopener noreferrer"
           className="underline break-all" style={{ color: "#93c5fd" }}
           onClick={(e) => e.stopPropagation()}>
          {seg.content}
        </a>
      );
    }
    if (!highlight?.trim()) return <span key={i}>{seg.content}</span>;
    const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = seg.content.split(new RegExp(`(${esc})`, "gi"));
    return (
      <span key={i}>
        {parts.map((p, j) =>
          p.toLowerCase() === highlight.toLowerCase()
            ? <mark key={j} style={{ background: "#f3d438", color: "#000", borderRadius: "2px", padding: "0 1px" }}>{p}</mark>
            : p,
        )}
      </span>
    );
  });
}

function scrollToMessage(msgId: string) {
  const el = document.getElementById(`msg-${msgId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.transition = "background 0.3s";
  el.style.background = `${ACCENT}14`;
  setTimeout(() => { el.style.background = ""; }, 1000);
}

const ChatMessage = memo(function ChatMessage({
  message, isOwn, isConsecutive, isLastInGroup, highlight,
  reactions, onReply, onEdit, onDeleteForMe, onReact,
}: ChatMessageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isHearted, setIsHearted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchHandledRef = useRef(false);
  const {
    unsendMessage, selectedMenuMessageId, setSelectedMenuMessageId,
    avatarColor, currentUsername, pendingIds, dataSaverMode,
  } = useChatStore();

  const senderColor = isOwn ? avatarColor : autoAvatarColor(message.senderName);
  const isPending = pendingIds.has(message.id);

  const attachments = message.attachments && message.attachments.length > 0
    ? message.attachments as Array<{ objectPath: string; fileName: string; fileSize: number; mimeType: string }>
    : null;

  const hasText = !message.unsent && !message.voiceNote && message.message.trim().length > 0;
  const hasHeartReaction = reactions?.some((reaction) => reaction.emoji === "❤️" && reaction.users.includes(currentUsername ?? "")) ?? false;

  useEffect(() => {
    if (selectedMenuMessageId !== message.id && menuOpen) setMenuOpen(false);
  }, [selectedMenuMessageId, message.id, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const { preview: linkPreview } = useLinkPreview(
    hasText ? message.message : null,
    !message.voiceNote && !message.unsent,
  );

  const openMenu = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setMenuOpen(true);
    setSelectedMenuMessageId(message.id);
  }, [message.id, setSelectedMenuMessageId]);

  const handleUnsend = useCallback(() => {
    unsendMessage(message.id);
    socketService.getSocket()?.emit("unsend_message", { messageId: message.id });
  }, [message.id, unsendMessage]);

  const handleCopy = useCallback(() => {
    if (!message.voiceNote) navigator.clipboard.writeText(message.message).catch(() => {});
  }, [message.message, message.voiceNote]);

  const handleReact = useCallback((emoji: string) => {
    if (emoji === "❤️") setIsHearted((previous) => !previous);
    onReact?.(emoji);
  }, [onReact]);

  const triggerHeart = useCallback(() => {
    if (message.unsent || message.voiceNote) return;
    const currentlyHearted = isHearted || hasHeartReaction;
    setShowHeart(!currentlyHearted);
    handleReact("❤️");
    setTimeout(() => setShowHeart(false), 800);
  }, [message.unsent, message.voiceNote, isHearted, hasHeartReaction, handleReact]);

  const handleDoubleTap = useCallback(() => {
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 350) triggerHeart();
    lastTapRef.current = now;
  }, [triggerHeart]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    touchStartRef.current = { x: event.clientX, y: event.clientY };
    touchHandledRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      touchHandledRef.current = true;
      openMenu();
    }, 550);
  }, [clearLongPress, openMenu]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !touchStartRef.current) return;
    const movedX = Math.abs(event.clientX - touchStartRef.current.x);
    const movedY = Math.abs(event.clientY - touchStartRef.current.y);
    if (movedX > 10 || movedY > 10) clearLongPress();
  }, [clearLongPress]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !touchStartRef.current) return;
    clearLongPress();
    const deltaX = event.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(event.clientY - touchStartRef.current.y);
    touchStartRef.current = null;
    if (deltaX > 64 && deltaX > deltaY * 1.25) {
      touchHandledRef.current = true;
      onReply();
    }
  }, [clearLongPress, onReply]);

  useEffect(() => clearLongPress, [clearLongPress]);

  const time = format(new Date(message.timestamp as unknown as string), "HH:mm");
  const emojiOnly = !message.unsent && !message.voiceNote && !attachments && isEmojiOnly(message.message);
  const isMatch = !!highlight?.trim() && !message.voiceNote &&
    message.message.toLowerCase().includes(highlight.toLowerCase());

  const ownRadius = isLastInGroup ? "16px 16px 4px 16px" : "16px";
  const otherRadius = !isConsecutive ? "4px 16px 16px 16px" : "16px";
  const tickColor = isPending ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)";

  return (
    <div
      id={`msg-${message.id}`}
      ref={containerRef}
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start",
        isConsecutive ? "mt-1" : "mt-1.5",
        isMatch && "rounded-xl bg-primary/10"
      )}
      onClick={handleDoubleTap}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={clearLongPress}
      style={{ touchAction: "pan-y" }}
    >
      {/* Others' avatar */}
      {!isOwn && (
        <div className="mr-1.5 self-end shrink-0" style={{ width: 28 }}>
          {isLastInGroup && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: senderColor }}
            >
              {message.senderName[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className={cn("flex flex-col max-w-[72%] md:max-w-[60%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && !isConsecutive && !message.unsent && (
          <span className="mb-1 ml-1 max-w-full truncate text-sm font-semibold leading-none" style={{ color: senderColor }}>
            {message.senderName}
          </span>
        )}

        {/* Reply quote */}
        {message.replyToMessage && !message.unsent && (
          <div className={cn("flex mb-1", isOwn ? "justify-end" : "justify-start")}>
            <button
              type="button"
              className={cn(
                "flex gap-2 px-3 py-2 max-w-[220px] overflow-hidden rounded-xl border transition-opacity hover:opacity-80",
                isOwn ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-foreground"
              )}
              onClick={(e) => { e.stopPropagation(); if (message.replyTo) scrollToMessage(message.replyTo); }}
            >
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold leading-none" style={{ color: isOwn ? ACCENT : senderColor }}>
                  {message.replyToSender}
                </span>
                <span className="truncate text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {message.replyToMessage}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Bubble row */}
        <div className="group relative flex flex-row items-end gap-1">
          {/* Own options */}
          {isOwn && !message.unsent && !isPending && (
            <div className="relative self-center shrink-0">
              <button
                className={cn(
                  "p-1 rounded-full transition-all opacity-0 group-hover:opacity-100",
                  menuOpen && "opacity-100",
                )}
                style={{ color: "rgba(255,255,255,0.25)" }}
                onClick={openMenu}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <MessageOptionsMenu
                open={menuOpen} onClose={() => setMenuOpen(false)}
                onEdit={message.voiceNote ? undefined : onEdit}
                onUnsend={handleUnsend}
                onCopy={message.voiceNote ? undefined : handleCopy}
                onDeleteForMe={onDeleteForMe}
                align="right"
              />
            </div>
          )}

          {/* Others' options */}
          {!isOwn && !message.unsent && (
              <div className={cn(
                "absolute left-0 top-1/2 z-10 flex -translate-x-full -translate-y-1/2 items-center gap-0.5 pr-1",
                menuOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto",
              )}>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-white/55 transition-colors hover:bg-primary/15 hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); onReply(); }}
                  aria-label="Reply to message"
                  title="Reply"
                >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  className={cn("flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-white/55 transition-colors hover:bg-primary/15 hover:text-primary", menuOpen && "bg-primary/15 text-primary")}
                  onClick={openMenu}
                  aria-label="Options"
                  title="Message options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              <MessageOptionsMenu
                open={menuOpen} onClose={() => setMenuOpen(false)}
                onReply={() => { onReply(); setMenuOpen(false); }}
                onCopy={message.voiceNote ? undefined : handleCopy}
                onDeleteForMe={onDeleteForMe}
                align="left"
              />
            </div>
          )}

          {/* Content column: attachments + bubble */}
          <div className="relative flex flex-col gap-1">
            {/* Quick-react picker */}
            {!message.unsent && !message.voiceNote && onReact && (
              <div
                className={cn(
                  "absolute opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                  "transition-opacity flex items-center gap-0.5 px-1.5 py-1 rounded-full z-10",
                  isOwn ? "right-0 -top-10" : "left-0 -top-10",
                )}
                style={{
                  background: "#1A1F2E",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                    className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 active:scale-90 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Attachments */}
            {attachments && !message.unsent && (
              <AttachmentDisplay attachments={attachments} isOwn={isOwn} />
            )}

            {/* Text bubble */}
            {(hasText || message.voiceNote || message.unsent) && (
              emojiOnly ? (
                <div className="flex flex-col">
                  <span className="select-text px-1 text-5xl leading-tight">{message.message}</span>
                  <span
                    className={cn("mt-0.5 px-1 font-mono text-xs tabular-nums", isOwn ? "text-right" : "text-left")}
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    {time}{isOwn && <span style={{ color: tickColor }}> ✓</span>}
                  </span>
                </div>
              ) : (
                <div
                  className={cn(
                    "break-words select-text relative overflow-hidden text-sm leading-relaxed rounded-2xl border border-border",
                    message.unsent ? "bg-background/40 text-muted opacity-90 px-4 py-3" :
                    message.voiceNote ? "bg-surface/95 text-foreground px-4 py-3 min-w-[260px]" :
                    isPending ? "bg-primary/10 ring-1 ring-primary/60 text-foreground px-4 py-3" :
                    isOwn ? "bg-primary/90 text-primary-foreground px-4 py-3" :
                    "bg-[#1F2937] text-foreground px-4 py-3"
                  )}
                >
                  {message.voiceNote && !message.unsent ? (
                    <div className="flex flex-col gap-1">
                      <VoicePlayer
                        src={message.message}
                        duration={message.voiceDuration}
                        isOwn={isOwn}
                        dataSaverMode={dataSaverMode}
                      />
                      <div className={cn("flex items-center gap-1 mt-0.5", isOwn ? "justify-end" : "justify-start")}>
                        <span className="font-mono text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.28)" }}>{time}</span>
                        {isOwn && <span className="font-mono text-xs" style={{ color: tickColor }}>✓</span>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        className={message.unsent ? "italic text-sm leading-relaxed" : "whitespace-pre-wrap text-sm leading-relaxed"}
                        style={{ color: message.unsent ? "rgba(255,255,255,0.25)" : undefined }}
                      >
                        {message.unsent ? "This message was deleted" : renderContent(message.message, highlight)}
                      </p>
                      {!message.unsent && (
                        <div className="flex items-center gap-1 mt-0.5 float-right ml-3">
                          {message.edited && (
                            <span className="font-mono text-xs italic" style={{ color: "rgba(255,255,255,0.28)" }}>edited</span>
                          )}
                          <span className="font-mono text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>{time}</span>
                          {isOwn && (isPending
                            ? <Clock3 className="h-3 w-3" style={{ color: tickColor }} />
                            : <span className="font-mono text-xs" style={{ color: tickColor }}>✓</span>)}
                        </div>
                      )}
                      <AnimatePresence>
                        {showHeart && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.3, 1.1, 1.1] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7, times: [0, 0.35, 0.6, 1] }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{ background: "rgba(0,0,0,0.12)" }}
                          >
                            <span className="text-3xl">❤️</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )
            )}

            {/* Link preview card */}
            {linkPreview && (
              <div className={cn("mt-1.5", isOwn ? "ml-auto" : "mr-auto")} style={{ maxWidth: "320px" }}>
                <LinkPreviewCard preview={linkPreview} />
              </div>
            )}

            {/* Attachment-only timestamp */}
            {attachments && !hasText && !message.voiceNote && !message.unsent && (
              <div className={cn("flex items-center gap-1 px-1", isOwn ? "justify-end" : "justify-start")}>
                <span className="font-mono text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {time}
                </span>
                {isOwn && <span className="font-mono text-xs" style={{ color: tickColor }}>✓</span>}
              </div>
            )}

            {/* Heart badge */}
            {(isHearted || hasHeartReaction) && !message.unsent && (
              <div
                className={cn("absolute -bottom-2.5", isOwn ? "right-1" : "left-1")}
                style={{
                  background: "#1A1F2E",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "1px 4px",
                  fontSize: "11px",
                }}
              >
                ❤️
              </div>
            )}
          </div>
        </div>

        {(isHearted || hasHeartReaction) && !message.unsent && <div className="h-3" />}

        {/* Reaction pills */}
        {reactions && reactions.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1 ml-1", isOwn ? "justify-end" : "justify-start")}>
            {reactions.map((r) => {
              const isMine = r.users.includes(currentUsername ?? "");
              return (
                <button
                  key={r.emoji}
                  onClick={(e) => { e.stopPropagation(); handleReact(r.emoji); }}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: isMine ? `${ACCENT}14` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isMine ? `${ACCENT}25` : "rgba(255,255,255,0.06)"}`,
                    color: isMine ? ACCENT : "rgba(255,255,255,0.4)",
                  }}
                >
                  {r.emoji} <span className="font-medium tabular-nums">{r.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatMessage;
